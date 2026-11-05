import express from 'express'
import mongoose from 'mongoose'
import authenticateToken from '../auth/authenticateToken.js'
import requireOwner from '../auth/requireOwner.js'
import { sendToUser } from '../lib/push.js'
import { normalizeTags } from '../lib/tags.js'
import Card from '../schema/card.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'
import {
  normalizePrice,
  validatePrice,
  validateTransactionBody
} from '../lib/validateTransaction.js'

const router = express.Router()

// Guest transactions are the ones stored without a user (userID: null).
function buildFilter (userID, { category, card, startDate, endDate }) {
  const filter = { userID }

  if (typeof category === 'string' && category) filter.category = category
  if (typeof card === 'string' && card) filter.card = card

  if (typeof startDate === 'string' && typeof endDate === 'string') {
    const start = new Date(`${startDate}T00:00:00Z`)
    const end = new Date(`${endDate}T23:59:59Z`)
    if (!isNaN(start) && !isNaN(end)) {
      filter.datetime = { $gte: start, $lte: end }
    }
  }

  return filter
}

const cardView = (card, fallbackIcon = '') => ({
  name: card.name,
  icon: card.icon || fallbackIcon,
  type: card.type || 'credit',
  last4: card.last4 || '',
  limit: card.limit || 0,
  tone: card.tone || ''
})

async function getCards (userID) {
  const [transactions, saved] = await Promise.all([
    TransactionModel.find({ userID }).select('card icon'),
    userID ? Card.find({ userID }) : []
  ])

  const derived = new Map()
  for (const { card, icon } of transactions) {
    if (card && !derived.has(card)) derived.set(card, icon || '')
  }

  const cards = new Map()
  for (const card of saved) {
    if (!card.hidden) cards.set(card.name, cardView(card, derived.get(card.name)))
  }

  const hidden = new Set(saved.filter(c => c.hidden).map(c => c.name))
  for (const [name, icon] of derived) {
    if (!cards.has(name) && !hidden.has(name)) cards.set(name, cardView({ name, icon }))
  }

  return [...cards.values()]
}

const merchantChoice = value =>
  typeof value === 'string' && /^(none|[a-f0-9]{24})?$/.test(value) ? value : ''

async function notifyLargeExpense (userID, price, name) {
  const amount = parseFloat(String(price).replace(/[,+]/g, ''))
  if (!(amount < 0)) return

  const user = await User.findById(userID).select('settings')
  const { notifications, largeAmount } = user?.settings ?? {}
  if (notifications?.large && Math.abs(amount) > largeAmount) {
    await sendToUser(userID, {
      title: 'Large expense logged',
      body: `${name}: ${Math.abs(amount).toFixed(2)}`,
      url: '/'
    })
  }
}

async function createTransaction (req, res, userID) {
  const { name, price, datetime, description, category, card, icon } = req.body

  const error = validateTransactionBody(req.body)
  if (error) return res.status(400).json({ error })

  // A card name can only ever be paired with one icon.
  if (card && icon) {
    const existing = (await getCards(userID)).find(c => c.name === card)
    if (existing?.icon && existing.icon !== icon) {
      return res
        .status(400)
        .json({ error: 'The card already exists, please use other name.' })
    }
  }

  const transaction = await TransactionModel.create({
    name,
    price: normalizePrice(price),
    datetime,
    description,
    userID,
    category,
    card,
    icon,
    tags: normalizeTags(req.body.tags),
    merchant: merchantChoice(req.body.merchant)
  })

  if (userID) {
    await notifyLargeExpense(userID, transaction.price, name)
  }
  res.json(transaction)
}

function requireValidId (req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid transaction id.' })
  }
  next()
}

// Guest transactions (no userID) are shared and stay open. Anything that belongs
// to a user can only be changed with that user's token.
async function requireTransactionAccess (req, res, next) {
  const transaction = await TransactionModel.findById(req.params.id)
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' })
  }

  req.transaction = transaction
  if (!transaction.userID) return next()

  authenticateToken(req, res, () => {
    if (req.user.id !== transaction.userID) {
      return res.status(403).json({ error: 'Not allowed.' })
    }
    next()
  })
}

router.get('/transactions', async (req, res) => {
  res.json(await TransactionModel.find(buildFilter(null, req.query)))
})

router.get('/transactions/:id', requireOwner, async (req, res) => {
  res.json(await TransactionModel.find(buildFilter(req.params.id, req.query)))
})

router.post('/transactions/multi/:id', requireOwner, async (req, res) => {
  const transactions = req.body

  if (!Array.isArray(transactions)) {
    return res
      .status(400)
      .json({ error: 'The request body must be an array of transactions.' })
  }

  const validTransactions = []
  for (const transaction of transactions) {
    if (!Array.isArray(transaction)) {
      return res.status(400).json({ error: 'Each transaction must be a list.' })
    }

    const [date, name, description, price, card, category, icon] = transaction

    const datetime = new Date(date)
    if (isNaN(datetime)) {
      return res
        .status(400)
        .json({ error: `Invalid date for transaction: ${transaction}` })
    }

    if (!name) {
      return res
        .status(400)
        .json({ error: `The name is required for transaction: ${transaction}` })
    }

    const priceTrim = normalizePrice(price)
    const priceError = validatePrice(priceTrim)
    if (priceError) {
      return res
        .status(400)
        .json({ error: `${priceError} Transaction: ${transaction}` })
    }

    validTransactions.push({
      userID: req.params.id,
      datetime,
      name,
      description: description || '',
      price: priceTrim,
      card: card || '',
      category: category || '',
      icon: icon || ''
    })
  }

  res.json(await TransactionModel.insertMany(validTransactions))
})

router.post('/transaction', (req, res) => createTransaction(req, res, null))

router.post('/transaction/:id', requireOwner, (req, res) =>
  createTransaction(req, res, req.params.id)
)

router.get('/cards', async (req, res) => {
  res.json(await getCards(null))
})

router.get('/cards/:id', requireOwner, async (req, res) => {
  res.json(await getCards(req.params.id))
})

router.post('/cards/:id', requireOwner, async (req, res) => {
  const { name, icon, type, last4, limit, tone } = req.body
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'The card name must not be empty.' })
  }

  const update = { hidden: false }
  // Bundled logos are file names (case matters); anything with a dot is a domain.
  if (typeof icon === 'string') {
    const value = icon.trim().slice(0, 100)
    update.icon = value.includes('.') ? value.toLowerCase() : value
  }
  if (type === 'credit' || type === 'debit') update.type = type
  if (typeof tone === 'string') update.tone = tone.slice(0, 20)
  if (last4 !== undefined) {
    if (typeof last4 !== 'string' || (last4 && !/^\d{4}$/.test(last4))) {
      return res.status(400).json({ error: 'Last digits must be 4 numbers.' })
    }
    update.last4 = last4
  }
  if (limit !== undefined && limit !== '') {
    const number = Number(limit)
    if (!Number.isFinite(number) || number < 0) {
      return res.status(400).json({ error: 'The credit limit is not valid.' })
    }
    update.limit = number
  }

  const card = await Card.findOneAndUpdate(
    { userID: req.params.id, name: name.trim() },
    { $set: update },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
  res.json(cardView(card))
})

// Transactions keep the card's name, so the card is hidden rather than erased.
router.delete('/cards/:id/:name', requireOwner, async (req, res) => {
  await Card.findOneAndUpdate(
    { userID: req.params.id, name: req.params.name },
    { hidden: true },
    { upsert: true }
  )
  res.json({ success: true })
})

router.delete(
  '/transaction/delete/:id',
  requireValidId,
  requireTransactionAccess,
  async (req, res) => {
    await req.transaction.deleteOne()
    res.json(req.transaction)
  }
)

router.put(
  '/transaction/update/:id',
  requireValidId,
  requireTransactionAccess,
  async (req, res) => {
    const { name, price, datetime, description, category, card, icon } = req.body

    const error = validateTransactionBody(req.body)
    if (error) return res.status(400).json({ error })

    Object.assign(req.transaction, {
      name,
      price: normalizePrice(price),
      datetime,
      description,
      category,
      icon,
      card
    })
    if (req.body.tags !== undefined) req.transaction.tags = normalizeTags(req.body.tags)
    if (req.body.merchant !== undefined) req.transaction.merchant = merchantChoice(req.body.merchant)
    await req.transaction.save()
    res.json(req.transaction)
  }
)

export default router
