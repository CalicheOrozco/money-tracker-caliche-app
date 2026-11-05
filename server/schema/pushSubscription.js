import mongoose from 'mongoose'

const pushSubscriptionSchema = new mongoose.Schema({
  userID: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
})

const PushSubscription = mongoose.model(
  'PushSubscription',
  pushSubscriptionSchema
)

export default PushSubscription
