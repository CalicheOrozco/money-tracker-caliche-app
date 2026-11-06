import { Schema, model } from 'mongoose'

const TransactionSchema = new Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  description: { type: String, required: false },
  datetime: { type: Date, required: true },
  userID: { type: String, required: false },
  category: { type: String, required: false },
  card: { type: String, required: false },
  icon: { type: String, required: false },
  tags: { type: [String], default: [] },
  // Empty follows the merchant patterns, "none" opts out, anything else is a merchant id.
  merchant: { type: String, default: '' },
  // Parts of one purchase in different categories. Their amounts add up to the price.
  splits: { type: [{ _id: false, category: String, amount: Number }], default: [] }
}, { timestamps: true })

// Every read is per user, sorted by date or grouped by card.
TransactionSchema.index({ userID: 1, datetime: -1 })
TransactionSchema.index({ userID: 1, card: 1 })

const TransactionModel = model('Transaction', TransactionSchema)

export default TransactionModel
