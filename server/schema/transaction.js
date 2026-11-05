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
  merchant: { type: String, default: '' }
})

const TransactionModel = model('Transaction', TransactionSchema)

export default TransactionModel
