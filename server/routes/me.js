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
  NetWorthSnapshot,
  RecurringOverride,
  Rule
} from '../schema/planning.js'
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
  'networth-snapshots': { Model: NetWorthSnapshot, upsertBy: 'date', fields: { date: 'date!', value: 'number' } }
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

router.get('/:collection', async (req, res) => {
  const { Model } = collection(req)
  res.json(await Model.find({ userID: req.user.id }).sort({ _id: 1 }))
})

router.post('/:collection', async (req, res) => {
  const { Model, fields, upsertBy } = collection(req)
  const data = clean(fields, req.body, false)

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
  const { Model, fields } = collection(req)
  const item = await Model.findOneAndUpdate(
    { _id: req.params.id, userID: req.user.id },
    { $set: clean(fields, req.body, true) },
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
