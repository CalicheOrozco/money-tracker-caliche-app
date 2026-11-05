import mongoose from 'mongoose'

// Cards also exist implicitly through the transactions that use them. A document
// here adds a card with no transactions yet, stores its details, or hides one
// the user removed.
const cardSchema = new mongoose.Schema({
  userID: { type: String, required: true, index: true },
  name: { type: String, required: true },
  icon: { type: String, default: '' },
  type: { type: String, enum: ['credit', 'debit', 'savings', 'investment'], default: 'credit' },
  last4: { type: String, default: '' },
  limit: { type: Number, default: 0 },
  tone: { type: String, default: '' },
  hidden: { type: Boolean, default: false }
})

cardSchema.index({ userID: 1, name: 1 }, { unique: true })

const Card = mongoose.model('Card', cardSchema)

export default Card
