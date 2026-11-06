import mongoose from 'mongoose'

const { Schema, model } = mongoose

function owned (fields, uniqueBy) {
  const schema = new Schema({
    userID: { type: String, required: true, index: true },
    ...fields
  }, { timestamps: true })
  if (uniqueBy) schema.index({ userID: 1, [uniqueBy]: 1 }, { unique: true })
  return schema
}

export const Budget = model('Budget', owned({
  category: { type: String, required: true },
  limit: { type: Number, required: true }
}, 'category'))

export const Goal = model('Goal', owned({
  name: { type: String, required: true },
  target: { type: Number, required: true },
  saved: { type: Number, default: 0 },
  due: { type: String, default: '' },
  icon: { type: String, default: 'savings' }
}))

export const Debt = model('Debt', owned({
  person: { type: String, required: true },
  dir: { type: String, enum: ['owed', 'owe'], required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  date: { type: String, default: '' },
  settled: { type: Boolean, default: false }
}))

export const Holding = model('Holding', owned({
  side: { type: String, enum: ['asset', 'liab'], required: true },
  name: { type: String, required: true },
  kind: { type: String, default: '' },
  value: { type: Number, required: true }
}))

export const Rule = model('Rule', owned({
  match: { type: String, required: true },
  category: { type: String, required: true },
  tag: { type: String, default: '' }
}))

export const RecurringOverride = model('RecurringOverride', owned({
  key: { type: String, required: true },
  type: { type: String, enum: ['sub', 'bill'] },
  status: { type: String, enum: ['confirmed', 'cancelled', 'dismissed'] }
}, 'key'))

// Patterns are lowercase text fragments; any of them in a transaction's name or
// description links it to the merchant. Only the chosen domain is stored, the
// logo itself is always loaded live from the logo service.
export const Merchant = model('Merchant', owned({
  name: { type: String, required: true },
  domain: { type: String, default: '' },
  patterns: { type: [String], default: [] },
  category: { type: String, default: '' }
}))

// Subscriptions and bills the user adds by hand, for charges the automatic
// detection misses. `match` finds the matching transactions for history.
export const RecurringPayment = model('RecurringPayment', owned({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['sub', 'bill', 'income'], default: 'sub' },
  frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly', 'yearly'], default: 'monthly' },
  next: { type: String, required: true },
  category: { type: String, default: '' },
  card: { type: String, default: '' },
  match: { type: String, default: '' },
  active: { type: Boolean, default: true }
}))

// Money moved between the user's own accounts. Kept apart from transactions because
// it is neither income nor spending. `source` holds the transactions it replaced, so
// a conversion can be undone.
export const Transfer = model('Transfer', owned({
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  note: { type: String, default: '' },
  source: { type: [Schema.Types.Mixed], default: [] }
}))

// Suggested transfers the user said are not transfers.
export const TransferDismissal = model('TransferDismissal', owned({
  key: { type: String, required: true }
}, 'key'))

// One value per day, so the net worth chart is built from real history.
export const NetWorthSnapshot = model('NetWorthSnapshot', owned({
  date: { type: String, required: true },
  value: { type: Number, required: true }
}, 'date'))

export const PLANNING_MODELS = [
  Budget, Goal, Debt, Holding, Rule, RecurringOverride, NetWorthSnapshot, Merchant, RecurringPayment,
  Transfer, TransferDismissal
]
