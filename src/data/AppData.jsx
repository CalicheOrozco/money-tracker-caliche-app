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
import { patternMatch, resolveMerchant } from '../lib/merchants.js'
import { recurringState } from '../lib/recurring.js'
import { byNewest, fromApiTransfer, transferSuggestions } from '../lib/transfers.js'
import { useCollection } from './useCollection.js'

const AppDataContext = createContext(null)

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

  const saveTransaction = useCallback(async (record, editingId) => {
    if (editingId) {
      await api(`/transaction/update/${editingId}`, {
        method: 'PUT',
        body: toApi(record)
      })
    } else {
      await api(userID ? `/transaction/${userID}` : '/transaction', {
        method: 'POST',
        body: toApi(record)
      })
    }
    await reload()
  }, [userID, reload])

  const removeTransaction = useCallback(async transaction => {
    await api(`/transaction/delete/${transaction.id}`, { method: 'DELETE' })
    await reload()
    showToast('Transaction deleted', {
      undo: async () => {
        setToast(null)
        await saveTransaction(transaction).catch(showError)
      }
    })
  }, [reload, saveTransaction, showError, showToast])

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

  const removeTransfer = useCallback(async transfer => {
    await api(`/me/transfers/${transfer.id}`, { method: 'DELETE' })
    await reloadTransfers()
    showToast('Transfer deleted', {
      undo: async () => {
        setToast(null)
        await saveTransfer(transfer).catch(showError)
      }
    })
  }, [reloadTransfers, saveTransfer, showError, showToast])

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
    await reload()
  }, [userID, reload])

  const removeCard = useCallback(async name => {
    await api(`/cards/${userID}/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await reload()
  }, [userID, reload])

  // Transfers go first because they are validated as a whole before anything is saved.
  const importRows = useCallback(async (rows, transferRows = []) => {
    if (transferRows.length) await api('/me/transfers/bulk', { method: 'POST', body: transferRows })
    if (rows.length) await api(`/transactions/multi/${userID}`, { method: 'POST', body: rows })
    await Promise.all([reload(), reloadTransfers()])
  }, [userID, reload, reloadTransfers])

  const deleteAllTransactions = useCallback(async () => {
    await api('/profile/transactions', { method: 'DELETE' })
    await Promise.all([reload(), reloadTransfers()])
  }, [reload, reloadTransfers])

  // The first rule whose text appears in the name or description wins.
  const ruleFor = useCallback(text => {
    const value = String(text || '').toLowerCase()
    return rules.items.find(rule => rule.match && value.includes(rule.match)) || null
  }, [rules.items])

  const merchantOf = useCallback(t => resolveMerchant(merchants.items, t), [merchants.items])
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
      hidden, setHidden, drawer, toast, setToast, showToast, showError, format, metrics,
      recurring, manualRecurring, rules, overrides, ruleFor, merchants, merchantOf, merchantFor, cardFilter, setCardFilter, openNew, openEdit,
      closeDrawer, reload, saveTransaction, removeTransaction, saveCard, removeCard, importRows,
      deleteAllTransactions, transfers, transferDismissals, transferList, transferHints, saveTransfer, removeTransfer,
      revertTransfer, convertToTransfer
    }),
    [
      guest, userID, settings, transactions, cards, loading, range, privacy, hidden, setHidden,
      drawer, toast, showToast, showError, format, metrics, recurring, rules, overrides, ruleFor,
      merchants, merchantOf, merchantFor, manualRecurring,
      cardFilter, openNew, openEdit, closeDrawer, reload, saveTransaction, removeTransaction,
      saveCard, removeCard, importRows, deleteAllTransactions, transfers, transferDismissals, transferList, transferHints,
      saveTransfer, removeTransfer, revertTransfer, convertToTransfer
    ]
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export const useAppData = () => useContext(AppDataContext)
