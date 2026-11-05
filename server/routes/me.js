import express from 'express'
import mongoose from 'mongoose'
import authenticateToken from '../auth/authenticateToken.js'
import { normalizeTag } from '../lib/tags.js'
import {
  Budget,
  Debt,
  Goal,
  Holding,
  Merchant,
  RecurringPayment,
  NetWorthSnapshot,
  RecurringOverride,
  Rule,
  Transfer,
  TransferDismissal
} from '../schema/planning.js'
import Card from '../schema/card.js'
import TransactionModel from '../schema/transaction.js'

const router = express.Router()

// A trailing "!" marks a required field.
const COLLECTIONS = {
  budgets: { Model: Budget, upsertBy: 'category', fields: { category: 'string!', limit: 'number!' } },
  goals: { Model: Goal, fields: { name: 'string!', target: 'number!', saved: 'number', due: 'date', icon: 'string' } },
  debts: {
    Model: Debt,
    fields: { person: 'string!', dir: 'enum:owed|owe!', amount: 'number!', note: 'string', date: 'date', settled: 'boolean' }
  },
  holdings: { Model: Holding, fields: { side: 'enum:asset|liab!', name: 'string!', kind: 'string', value: 'number!' } },
  rules: { Model: Rule, fields: { match: 'string!', category: 'string!', tag: 'string' } },
  'recurring-overrides': {
    Model: RecurringOverride,
    upsertBy: 'key',
    fields: { key: 'string!', type: 'enum:sub|bill', status: 'enum:confirmed|cancelled|dismissed' }
  },
  merchants: { Model: Merchant, fields: { name: 'string!', domain: 'domain', patterns: 'patterns', category: 'string' } },
  recurring: {
    Model: RecurringPayment,
    fields: {
      name: 'string!', amount: 'number!', type: 'enum:sub|bill', frequency: 'enum:weekly|biweekly|monthly|yearly',
      next: 'date!', category: 'string', card: 'string', match: 'string', active: 'boolean'
    }
  },
  transfers: {
    Model: Transfer,
    fields: { from: 'string!', to: 'string!', amount: 'number!', date: 'date!', note: 'string' },
    check: checkTransfer
  },
  'transfer-dismissals': { Model: TransferDismissal, upsertBy: 'key', fields: { key: 'string!' } },
  'networth-snapshots': { Model: NetWorthSnapshot, upsertBy: 'date', fields: { date: 'date!', value: 'number' } }
}

function checkTransfer ({ from, to, amount }) {
  if (from === to) throw badRequest('Choose two different accounts.')
  if (!(amount > 0)) throw badRequest('The amount must be greater than 0.')
}

function badRequest (message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function clean (fields, body, partial) {
  const data = {}

  for (const [name, rule] of Object.entries(fields)) {
    const required = rule.endsWith('!')
    const kind = rule.replace(/!$/, '')
    const value = body?.[name]
    const blank = value === undefined || value === null || value === ''

    if (blank) {
      if (required && !partial) throw badRequest(`The ${name} is required.`)
      if (value === '' && ['string', 'date', 'domain'].includes(kind)) data[name] = ''
      continue
    }

    if (kind === 'string') {
      if (typeof value !== 'string') throw badRequest(`The ${name} is not valid.`)
      const text = value.trim().slice(0, 200)
      if (required && !text) throw badRequest(`The ${name} is required.`)
      data[name] = text
    } else if (kind === 'number') {
      const number = Number(value)
      if (!Number.isFinite(number)) throw badRequest(`The ${name} must be a number.`)
      data[name] = number
    } else if (kind === 'boolean') {
      if (typeof value !== 'boolean') throw badRequest(`The ${name} is not valid.`)
      data[name] = value
    } else if (kind === 'date') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw badRequest(`The ${name} must be a date.`)
      }
      data[name] = value
    } else if (kind === 'domain') {
      const domain = String(value).trim().toLowerCase()
      if (typeof value !== 'string' || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
        throw badRequest('The domain is not valid.')
      }
      data[name] = domain
    } else if (kind === 'patterns') {
      if (!Array.isArray(value) || value.some(p => typeof p !== 'string')) {
        throw badRequest(`The ${name} are not valid.`)
      }
      data[name] = [...new Set(value.map(p => p.trim().toLowerCase().slice(0, 60)).filter(Boolean))].slice(0, 30)
    } else if (kind.startsWith('enum:')) {
      if (!kind.slice(5).split('|').includes(value)) throw badRequest(`The ${name} is not valid.`)
      data[name] = value
    }
  }

  // Amounts in these collections are never negative; direction lives elsewhere.
  for (const name of ['limit', 'target', 'saved', 'amount', 'value']) {
    if (name in data && data[name] < 0) throw badRequest(`The ${name} cannot be negative.`)
  }
  if ('match' in data) data.match = data.match.toLowerCase()
  if ('tag' in data) data.tag = normalizeTag(data.tag)

  return data
}

function collection (req) {
  const entry = COLLECTIONS[req.params.collection]
  if (!entry) {
    const error = new Error('Not found')
    error.status = 404
    throw error
  }
  return entry
}

function requireValidId (req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id.' })
  }
  next()
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

router.use(authenticateToken)

router.post('/rules/:id/apply', requireValidId, async (req, res) => {
  const rule = await Rule.findOne({ _id: req.params.id, userID: req.user.id })
  if (!rule) return res.status(404).json({ error: 'Rule not found.' })

  const pattern = new RegExp(escapeRegExp(rule.match), 'i')
  const update = { $set: { category: rule.category } }
  if (rule.tag) update.$addToSet = { tags: rule.tag }

  const { modifiedCount } = await TransactionModel.updateMany(
    { userID: req.user.id, $or: [{ name: pattern }, { description: pattern }] },
    update
  )
  res.json({ modifiedCount })
})

const priceValue = t => parseFloat(String(t.price).replace(/[,\s+]/g, '')) || 0

// Replaces one transaction, or both sides of a transfer, with a single transfer.
router.post('/transfers/convert', async (req, res) => {
  const userID = req.user.id
  const { transactionIds: ids, from, to, note } = req.body ?? {}
  if (!Array.isArray(ids) || ![1, 2].includes(ids.length) || new Set(ids).size !== ids.length || !ids.every(mongoose.isValidObjectId)) {
    throw badRequest('Choose one transaction, or the two sides of a transfer.')
  }

  const found = await TransactionModel.find({ _id: { $in: ids }, userID })
  if (found.length !== ids.length) return res.status(404).json({ error: 'Transaction not found.' })
  const values = found.map(priceValue)
  if (found.length === 2 && (values[0] * values[1] >= 0 || Math.abs(values[0] + values[1]) > 0.005)) {
    throw badRequest('The two sides must be an expense and an income with the same amount.')
  }

  const outgoing = found[values.findIndex(value => value < 0)] || found[0]
  const data = clean(COLLECTIONS.transfers.fields, {
    from,
    to,
    amount: req.body.amount ?? Math.abs(values[0]),
    date: req.body.date ?? outgoing.datetime.toISOString().slice(0, 10),
    note: note ?? outgoing.name
  }, false)
  checkTransfer(data)

  // A card can exist only through its transactions, so it is saved before they go.
  const icons = Object.fromEntries(found.filter(t => t.card).map(t => [t.card, t.icon || '']))
  await Promise.all([data.from, data.to].map(name => Card.updateOne(
    { userID, name },
    { $setOnInsert: { icon: icons[name] || '' } },
    { upsert: true }
  )))
  const transfer = await Transfer.create({ ...data, userID, source: found.map(t => t.toObject()) })
  await TransactionModel.deleteMany({ _id: { $in: ids }, userID })
  res.json(transfer)
})

// Puts back the transactions a conversion replaced.
router.post('/transfers/:id/revert', requireValidId, async (req, res) => {
  const transfer = await Transfer.findOne({ _id: req.params.id, userID: req.user.id })
  if (!transfer) return res.status(404).json({ error: 'Not found.' })
  if (!transfer.source.length) throw badRequest('This transfer was not converted from transactions.')
  const restored = await TransactionModel.insertMany(transfer.source)
  await transfer.deleteOne()
  res.json(restored)
})

router.get('/:collection', async (req, res) => {
  const { Model } = collection(req)
  res.json(await Model.find({ userID: req.user.id }).sort({ _id: 1 }))
})

router.post('/:collection', async (req, res) => {
  const { Model, fields, upsertBy, check } = collection(req)
  const data = clean(fields, req.body, false)
  check?.(data)

  if (upsertBy) {
    const item = await Model.findOneAndUpdate(
      { userID: req.user.id, [upsertBy]: data[upsertBy] },
      { $set: data },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
    return res.json(item)
  }

  res.json(await Model.create({ ...data, userID: req.user.id }))
})

router.patch('/:collection/:id', requireValidId, async (req, res) => {
  const { Model, fields, check } = collection(req)
  const data = clean(fields, req.body, true)
  if (check) {
    const current = await Model.findOne({ _id: req.params.id, userID: req.user.id })
    if (!current) return res.status(404).json({ error: 'Not found.' })
    check({ from: current.from, to: current.to, amount: current.amount, ...data })
  }
  const item = await Model.findOneAndUpdate(
    { _id: req.params.id, userID: req.user.id },
    { $set: data },
    { returnDocument: 'after', runValidators: true }
  )
  if (!item) return res.status(404).json({ error: 'Not found.' })
  res.json(item)
})

router.delete('/:collection/:id', requireValidId, async (req, res) => {
  const { Model } = collection(req)
  const item = await Model.findOneAndDelete({ _id: req.params.id, userID: req.user.id })
  if (!item) return res.status(404).json({ error: 'Not found.' })
  res.json(item)
})

export default router
