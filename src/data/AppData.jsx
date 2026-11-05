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

export function AppDataProvider ({ guest, children }) {
  const { user } = useAuth()
  const userID = guest ? null : user?.id
  const settings = (!guest && user?.settings) || DEFAULT_SETTINGS

  const [transactions, setTransactions] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(settings.defaultRange)
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

  const saveCard = useCallback(async card => {
    await api(`/cards/${userID}`, { method: 'POST', body: card })
    await reload()
  }, [userID, reload])

  const removeCard = useCallback(async name => {
    await api(`/cards/${userID}/${encodeURIComponent(name)}`, { method: 'DELETE' })
    await reload()
  }, [userID, reload])

  const importRows = useCallback(async rows => {
    await api(`/transactions/multi/${userID}`, { method: 'POST', body: rows })
    await reload()
  }, [userID, reload])

  const deleteAllTransactions = useCallback(async () => {
    await api('/profile/transactions', { method: 'DELETE' })
    await reload()
  }, [reload])

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
    () => recurringState(transactions, overrides.items),
    [transactions, overrides.items]
  )

  const openNew = useCallback(preset => setDrawer({ open: true, editing: null, preset: preset || null }), [])
  const openEdit = useCallback(transaction => setDrawer({ open: true, editing: transaction, preset: null }), [])
  const closeDrawer = useCallback(() => setDrawer(d => ({ ...d, open: false })), [])

  const value = useMemo(
    () => ({
      guest, userID, settings, transactions, cards, loading, range, setRange, privacy, setPrivacy,
      hidden, setHidden, drawer, toast, setToast, showToast, showError, format, metrics,
      recurring, rules, overrides, ruleFor, merchants, merchantOf, merchantFor, cardFilter, setCardFilter, openNew, openEdit,
      closeDrawer, reload, saveTransaction, removeTransaction, saveCard, removeCard, importRows,
      deleteAllTransactions
    }),
    [
      guest, userID, settings, transactions, cards, loading, range, privacy, hidden, setHidden,
      drawer, toast, showToast, showError, format, metrics, recurring, rules, overrides, ruleFor,
      merchants, merchantOf, merchantFor,
      cardFilter, openNew, openEdit, closeDrawer, reload, saveTransaction, removeTransaction,
      saveCard, removeCard, importRows, deleteAllTransactions
    ]
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export const useAppData = () => useContext(AppDataContext)
