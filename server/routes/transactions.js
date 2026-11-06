import express from 'express'
import mongoose from 'mongoose'
import authenticateToken from '../auth/authenticateToken.js'
import requireOwner from '../auth/requireOwner.js'
import { priceValue } from '../lib/price.js'
import { sendToUser } from '../lib/push.js'
import { normalizeTags } from '../lib/tags.js'
import Card from '../schema/card.js'
import { RecurringPayment, Transfer } from '../schema/planning.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'
import {
  cleanSplits,
  normalizePrice,
  validIcon,
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
  tone: card.tone || '',
  balance: card.balance ?? null,
  balanceDate: card.balanceDate || '',
  balanceSetAt: card.balanceSetAt || null
})

async function getCards (userID) {
  const [used, saved] = await Promise.all([
    TransactionModel.aggregate([
      { $match: { userID, card: { $nin: ['', null] } } },
      { $group: { _id: '$card', icon: { $first: '$icon' }, first: { $min: '$_id' } } },
      { $sort: { first: 1 } }
    ]),
    userID ? Card.find({ userID }) : []
  ])

  const derived = new Map(used.map(({ _id, icon }) => [_id, icon || '']))

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
  const amount = priceValue(price)
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
  if (card && icon && !req.body.restoreId) {
    const saved = userID ? await Card.findOne({ userID, name: card }) : null
    const existingIcon = saved?.icon || (await TransactionModel.findOne({ userID, card }).select('icon').lean())?.icon
    if (existingIcon && existingIcon !== icon) {
      return res
        .status(400)
        .json({ error: 'The card already exists, please use other name.' })
    }
  }

  // Undo sends the deleted transaction's id back so it keeps its place in balances.
  const restoreId = req.body.restoreId
  const reuseId = userID && typeof restoreId === 'string' && mongoose.isValidObjectId(restoreId) &&
    !(await TransactionModel.exists({ _id: restoreId }))

  const transaction = await TransactionModel.create({
    ...(reuseId && { _id: restoreId }),
    name,
    price: normalizePrice(price),
    datetime,
    description,
    userID,
    category,
    card,
    icon,
    tags: normalizeTags(req.body.tags),
    merchant: merchantChoice(req.body.merchant),
    splits: cleanSplits(req.body.splits)
  })

  if (userID) {
    // Using a card that was removed brings it back.
    if (card) await Card.updateOne({ userID, name: card, hidden: true }, { hidden: false })
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
  if (!transaction.userID) return guestReadOnly(res)

  authenticateToken(req, res, () => {
    if (req.user.id !== transaction.userID) {
      return res.status(403).json({ error: 'Not allowed.' })
    }
    next()
  })
}

// Plain objects without internal fields: smaller responses and much less work per row.
const listTransactions = filter =>
  TransactionModel.find(filter).select('-__v -userID').sort({ datetime: -1 }).lean()

router.get('/transactions', async (req, res) => {
  res.json(await listTransactions(buildFilter(null, req.query)))
})

router.get('/transactions/:id', requireOwner, async (req, res) => {
  res.json(await listTransactions(buildFilter(req.params.id, req.query)))
})

// A single transaction, for clients that change one without loading everything.
router.get('/transaction/item/:id', requireValidId, requireTransactionAccess, (req, res) => {
  res.json(req.transaction)
})

// The guest demo is shared, so it can be read but not changed. Guests edit a copy
// that lives only in their browser.
const guestReadOnly = res => res.status(403).json({ error: 'The guest demo can’t be changed.' })

router.post('/transaction', (req, res) => guestReadOnly(res))

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
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) {
    return res.status(400).json({ error: 'The card name must have between 1 and 60 characters.' })
  }

  const update = { hidden: false }
  // Bundled logos are file names (case matters); anything with a dot is a domain.
  if (typeof icon === 'string') {
    if (!validIcon(icon.trim().toLowerCase().includes('.') ? icon.trim().toLowerCase() : icon.trim())) {
      return res.status(400).json({ error: 'The logo is not valid.' })
    }
    const value = icon.trim()
    update.icon = value.includes('.') ? value.toLowerCase() : value
  }
  if (['credit', 'debit', 'savings', 'investment', 'cash'].includes(type)) update.type = type
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

  const { balance, balanceDate } = req.body
  if (balance === '' || balance === null) {
    Object.assign(update, { balance: null, balanceDate: '', balanceSetAt: null })
  } else if (balance !== undefined) {
    const number = Number(balance)
    if (!Number.isFinite(number)) return res.status(400).json({ error: 'The balance is not valid.' })
    if (typeof balanceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(balanceDate)) {
      return res.status(400).json({ error: 'The balance needs a date.' })
    }
    const current = await Card.findOne({ userID: req.params.id, name: name.trim() })
    if (current?.balance !== number || current?.balanceDate !== balanceDate) {
      Object.assign(update, { balance: number, balanceDate, balanceSetAt: new Date() })
    }
  }

  const card = await Card.findOneAndUpdate(
    { userID: req.params.id, name: name.trim() },
    { $set: update },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
  res.json(cardView(card))
})

// Cards are linked by name, so a rename updates every place that uses it.
router.post('/cards/:id/rename', requireOwner, async (req, res) => {
  const userID = req.params.id
  const from = typeof req.body.from === 'string' ? req.body.from.trim() : ''
  const to = typeof req.body.to === 'string' ? req.body.to.trim() : ''
  if (!from || !to || to.length > 60) {
    return res.status(400).json({ error: 'The card name must have between 1 and 60 characters.' })
  }
  if (from === to) return res.json({ name: to })

  const taken = (await getCards(userID)).some(c => c.name.toLowerCase() === to.toLowerCase() && c.name !== from)
  if (taken || await Card.exists({ userID, name: to })) {
    return res.status(409).json({ error: 'You already have a card with that name.' })
  }

  const icon = (await TransactionModel.findOne({ userID, card: from }).select('icon').lean())?.icon || ''
  await Card.updateOne({ userID, name: from }, { $set: { name: to }, $setOnInsert: { icon } }, { upsert: true })
  await Promise.all([
    TransactionModel.updateMany({ userID, card: from }, { card: to }),
    Transfer.updateMany({ userID, from }, { from: to }),
    Transfer.updateMany({ userID, to: from }, { to }),
    Transfer.updateMany({ userID, 'source.card': from }, { $set: { 'source.$[item].card': to } }, { arrayFilters: [{ 'item.card': from }] }),
    RecurringPayment.updateMany({ userID, card: from }, { card: to })
  ])
  res.json({ name: to })
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

    const priceBefore = req.transaction.price
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
    // A new amount without new parts would no longer add up, so the split is removed.
    if (req.body.splits !== undefined) req.transaction.splits = cleanSplits(req.body.splits)
    else if (normalizePrice(price) !== priceBefore) req.transaction.splits = []
    await req.transaction.save()
    res.json(req.transaction)
  }
)

export default router
