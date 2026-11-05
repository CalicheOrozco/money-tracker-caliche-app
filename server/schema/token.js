import mongoose from 'mongoose'

// Refresh tokens are stored as a hash, so reading the database does not give
// working sessions. `token` is only set on documents created before that.
const tokenSchema = new mongoose.Schema({
  hash: { type: String, index: { unique: true, sparse: true } },
  token: { type: String, index: { sparse: true } },
  userID: { type: String, index: true },
  expiresAt: { type: Date, expires: 0 }
})

const Token = mongoose.model('Token', tokenSchema)

export default Token
