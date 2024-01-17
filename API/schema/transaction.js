import { Schema, model } from 'mongoose'

const TransactionSchema = new Schema({
  name: { type: String, required: true },
  price: { type: String, required: true },
  description: { type: String, required: false },
  datetime: { type: String, required: true },
  userID: { type: String, required: false }
})

const TransactionModel = model('Transaction', TransactionSchema)

export default TransactionModel
