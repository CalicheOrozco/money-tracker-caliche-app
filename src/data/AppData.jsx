import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { api } from '../lib/api.js'
import { CURRENCIES, DEFAULT_SETTINGS } from '../lib/constants.js'
import { computeMetrics } from '../lib/metrics.js'
import { matchAll, patternMatch, resolveMerchant } from '../lib/merchants.js'
import { recurringState } from '../lib/recurring.js'
import { byNewest, fromApiTransfer, transferSuggestions } from '../lib/transfers.js'
import { useCollection } from './useCollection.js'

const AppDataContext = createContext(null)
// Toast and drawer change often, so they live apart and only re-render what shows them.
const AppUIContext = createContext(null)

const HIDDEN_KEY = 'mt-hidden-sections'

function readHidden () {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || {}
  } catch {
    return {}
  }
}

function fromApi (t) {
  return {
    id: t._id,
    name: t.name,
    desc: t.description || '',
    amount: parseFloat(String(t.price).replace(/[,\s+]/g, '')) || 0,
    date: String(t.datetime).slice(0, 10),
    category: t.category || 'Other',
    card: t.card || '',
    icon: t.icon || '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    merchant: t.merchant || ''
  }
}

function toApi (t) {
  return {
    name: t.name,
    price: (t.amount >= 0 ? '+' : '-') + Math.abs(t.amount).toFixed(2),
    datetime: t.date,
    description: t.desc,
    category: t.category,
    card: t.card,
    icon: t.icon,
    tags: t.tags || [],
    merchant: t.merchant || ''
  }
}

const transferBody = record => ({ from: record.from, to: record.to, amount: record.value, date: record.date, note: record.note })

export function AppDataProvider ({ guest, children }) {
  const { user } = useAuth()
  const userID = guest ? null : user?.id
  const settings = (!guest && user?.settings) || DEFAULT_SETTINGS

  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  // Guests see all the sample history; users start on their saved range (1M by default).
  const [range, setRange] = useState(guest ? 'All' : settings.defaultRange)
  const [privacy, setPrivacy] = useState(settings.privacyOnOpen)
  const [hidden, setHiddenState] = useState(readHidden)
  const [drawer, setDrawer] = useState({ open: false, editing: null, preset: null })
  const [toast, setToast] = useState(null)
  const [cardFilter, setCardFilter] = useState('')
  const toastTimer = useRef(null)

  const showToast = useCallback((message, options = {}) => {
    clearTimeout(toastTimer.current)
    setToast({ message, ...options })
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }, [])

  const showError = useCallback(error => {
    showToast(error.message || String(error), { error: true })
  }, [showToast])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const rules = useCollection('rules', { enabled: !guest, onError: showError })
  const overrides = useCollection('recurring-overrides', { enabled: !guest, onError: showError })
  const merchants = useCollection('merchants', { enabled: !guest, onError: showError })
  const merchantIgnores = useCollection('merchant-ignores', { enabled: !guest, onError: showError })
  const manualRecurring = useCollection('recurring', { enabled: !guest, onError: showError })
  const transfers = useCollection('transfers', { enabled: !guest, onError: showError })
  const transferDismissals = useCollection('transfer-dismissals', { enabled: !guest, onError: showError })
  const { reload: reloadTransfers } = transfers

  const reload = useCallback(async () => {
    const suffix = userID ? `/${userID}` : ''
    const [list, cardList] = await Promise.all([
      api(`/transactions${suffix}`),
      api(`/cards${suffix}`)
    ])
    setTransactions(
      list.map(fromApi).sort((a, b) => b.date.localeCompare(a.date))
    )
    setCards(cardList)
  }, [userID])

  const reloadCards = useCallback(async () => {
    setCards(await api(`/cards${userID ? `/${userID}` : ''}`))
  }, [userID])

  // Saves change one row, so the list is updated in place instead of downloading it all.
  const putTransaction = useCallback(saved => {
    const item = fromApi(saved)
    setTransactions(list => [...list.filter(t => t.id !== item.id), item].sort((a, b) => b.date.localeCompare(a.date)))
  }, [])

  useEffect(() => {
    reload()
      .catch(showError)
      .finally(() => setLoading(false))
  }, [reload, showError])

  const setHidden = useCallback(next => {
    setHiddenState(next)
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
    } catch {
      // Layout preferences are a convenience, losing them is harmless.
    }
  }, [])

  // Guests change a copy that only lives in this browser tab; the shared demo stays as is.
  const saveGuestTransaction = useCallback((record, editingId) => {
    const item = {
      ...record,
      id: editingId || `local-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      desc: record.desc || '',
      category: record.category || 'Other',
      card: record.card || '',
      icon: record.icon || '',
      tags: record.tags || [],
      merchant: record.merchant || ''
    }
    setTransactions(list => [...list.filter(t => t.id !== item.id), item].sort((a, b) => b.date.localeCompare(a.date)))
    if (item.card) {
      setCards(list => (list.some(c => c.name === item.card) ? list : [...list, { name: item.card, icon: item.icon, type: 'credit', last4: '', limit: 0, tone: '', balance: null }]))
    }
  }, [])

  const saveTransaction = useCallback(async (record, editingId) => {
    if (guest) return saveGuestTransaction(record, editingId)
    const saved = editingId
      ? await api(`/transaction/update/${editingId}`, { method: 'PUT', body: toApi(record) })
      : await api(`/transaction/${userID}`, { method: 'POST', body: toApi(record) })
    putTransaction(saved)
    // A new or removed card only shows up in the card list after asking for it again.
    if (record.card && !cards.some(c => c.name === record.card)) await reloadCards()
  }, [guest, saveGuestTransaction, userID, putTransaction, cards, reloadCards])

  const removeTransaction = useCallback(async transaction => {
    if (!guest) await api(`/transaction/delete/${transaction.id}`, { method: 'DELETE' })
    setTransactions(list => list.filter(t => t.id !== transaction.id))
    showToast('Transaction deleted', {
      undo: async () => {
        setToast(null)
        // Restored with the same id, so balances treat it as the original, and with
        // the card's current logo, which may have changed since.
        const icon = cards.find(c => c.name === transaction.card)?.icon ?? transaction.icon
        await (guest
          ? saveTransaction(transaction)
          : api(`/transaction/${userID}`, { method: 'POST', body: { ...toApi({ ...transaction, icon }), restoreId: transaction.id } }).then(putTransaction)
        ).catch(showError)
      }
    })
  }, [guest, userID, cards, putTransaction, saveTransaction, showError, showToast])

  const saveTransfer = useCallback(async (record, editingId) => {
    await api(editingId ? `/me/transfers/${editingId}` : '/me/transfers', {
      method: editingId ? 'PATCH' : 'POST',
      body: transferBody(record)
    })
    await reloadTransfers()
  }, [reloadTransfers])

  const revertTransfer = useCallback(async id => {
    await api(`/me/transfers/${id}/revert`, { method: 'POST' })
    await Promise.all([reload(), reloadTransfers()])
  }, [reload, reloadTransfers])

  // Undo puts back the exact transfer, including the transactions a conversion replaced.
  const removeTransfer = useCallback(async transfer => {
    const deleted = await api(`/me/transfers/${transfer.id}`, { method: 'DELETE' })
    await reloadTransfers()
    showToast('Transfer deleted', {
      undo: async () => {
        setToast(null)
        await api('/me/transfers/restore', { method: 'POST', body: deleted }).then(reloadTransfers).catch(showError)
      }
    })
  }, [reloadTransfers, showError, showToast])

  // Replaces transactions with a transfer. Undo brings the originals back.
  const convertToTransfer = useCallback(async (transactionIds, details) => {
    const saved = await api('/me/transfers/convert', { method: 'POST', body: { transactionIds, ...details } })
    await Promise.all([reload(), reloadTransfers()])
    showToast('Saved as a transfer', {
      undo: async () => {
        setToast(null)
        await revertTransfer(saved._id).catch(showError)
      }
    })
  }, [reload, reloadTransfers, revertTransfer, showError, showToast])

  const saveCard = useCallback(async card => {
    await api(`/cards/${userID}`, { method: 'POST', body: card })
    await reloadCards()
  }, [userID, reloadCards])

  const renameCard = useCallback(async (from, to) => {
    await api(`/cards/${userID}/rename`, { method: 'POST', body: { from, to } })
    await Promise.all([reload(), reloadTransfers(), manualRecurring.reload()])
  }, [userID, reload, reloadTransfers, manualRecurring])

  const removeCard = useCallback(async name => {
    await api(`/cards/${userID}/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await reloadCards()
  }, [userID, reloadCards])

  const deleteAllTransactions = useCallback(async password => {
    await api('/profile/transactions', { method: 'DELETE', body: { password } })
    await Promise.all([reload(), reloadTransfers()])
  }, [reload, reloadTransfers])

  // The first rule whose text appears in the name or description wins.
  const ruleFor = useCallback(text => {
    const value = String(text || '').toLowerCase()
    return rules.items.find(rule => rule.match && value.includes(rule.match)) || null
  }, [rules.items])

  const merchantOf = useCallback(t => resolveMerchant(merchants.items, t), [merchants.items])
  // The merchant a name would match automatically, with the pattern that matched.
  const autoMatch = useCallback(
    text => matchAll(merchants.items, String(text || '').toLowerCase())[0] || null,
    [merchants.items]
  )
  const merchantFor = useCallback(
    text => patternMatch(merchants.items, String(text || '').toLowerCase()),
    [merchants.items]
  )

  const currency = CURRENCIES[settings.currency] || CURRENCIES.MXN

  const format = useMemo(() => {
    const digits = amount =>
      Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: currency.decimals,
        maximumFractionDigits: currency.decimals
      })
    return {
      symbol: currency.symbol,
      plain: amount => currency.symbol + digits(amount),
      money: amount => (privacy ? `${currency.symbol} ••••` : currency.symbol + digits(amount)),
      signed: amount =>
        privacy ? '••••' : (amount < 0 ? '−' : '+') + currency.symbol + digits(amount),
      short: amount => {
        if (privacy) return '•••'
        const abs = Math.abs(amount)
        const text = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : String(Math.round(abs))
        return (amount < 0 ? '−' : '+') + text
      },
      compact: amount => {
        if (privacy) return '•••'
        const abs = Math.abs(amount)
        return currency.symbol + (abs >= 1000 ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : Math.round(abs))
      }
    }
  }, [currency, privacy])

  const metrics = useMemo(() => computeMetrics(transactions, range), [transactions, range])
  const recurring = useMemo(
    () => recurringState(transactions, overrides.items, manualRecurring.items),
    [transactions, overrides.items, manualRecurring.items]
  )

  const transferList = useMemo(() => transfers.items.map(fromApiTransfer).sort(byNewest), [transfers.items])
  const transferHints = useMemo(
    () => (guest ? [] : transferSuggestions(transactions, transferDismissals.items.map(d => d.key), cards)),
    [guest, transactions, transferDismissals.items, cards]
  )

  const openNew = useCallback(preset => setDrawer({ open: true, editing: null, preset: preset || null }), [])
  const openEdit = useCallback(transaction => setDrawer({ open: true, editing: transaction, preset: null }), [])
  const closeDrawer = useCallback(() => setDrawer(d => ({ ...d, open: false })), [])

  const value = useMemo(
    () => ({
      guest, userID, settings, transactions, cards, loading, range, setRange, privacy, setPrivacy,
      hidden, setHidden, setToast, showToast, showError, format, metrics,
      recurring, manualRecurring, rules, overrides, ruleFor, merchants, merchantIgnores, merchantOf, merchantFor, autoMatch, cardFilter, setCardFilter, openNew, openEdit,
      closeDrawer, reload, saveTransaction, removeTransaction, saveCard, renameCard, removeCard,
      deleteAllTransactions, transfers, transferDismissals, transferList, transferHints, saveTransfer, removeTransfer,
      revertTransfer, convertToTransfer
    }),
    [
      guest, userID, settings, transactions, cards, loading, range, privacy, hidden, setHidden,
      showToast, showError, format, metrics, recurring, rules, overrides, ruleFor,
      merchants, merchantIgnores, merchantOf, merchantFor, autoMatch, manualRecurring,
      cardFilter, openNew, openEdit, closeDrawer, reload, saveTransaction, removeTransaction,
      saveCard, renameCard, removeCard, deleteAllTransactions, transfers, transferDismissals, transferList, transferHints,
      saveTransfer, removeTransfer, revertTransfer, convertToTransfer
    ]
  )

  const ui = useMemo(() => ({ drawer, toast, setToast }), [drawer, toast])

  return (
    <AppDataContext.Provider value={value}>
      <AppUIContext.Provider value={ui}>{children}</AppUIContext.Provider>
    </AppDataContext.Provider>
  )
}

export const useAppData = () => useContext(AppDataContext)
export const useAppUI = () => useContext(AppUIContext)
