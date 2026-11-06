import { sha256 } from '../lib/secureHash.js'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_LIFETIME } from '../auth/sign.js'
import getUserInfo from '../lib/getUserInfo.js'
import Token from './token.js'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  photo: { type: String, default: '' },
  passwordChangedAt: { type: Date, default: null },
  // Set only with `npm run make-admin`. Admins can reset other users' passwords.
  admin: { type: Boolean, default: false },
  settings: {
    currency: { type: String, default: 'MXN' },
    defaultRange: { type: String, default: '1M' },
    privacyOnOpen: { type: Boolean, default: false },
    budget: { type: Number, default: 0 },
    largeAmount: { type: Number, default: 5000 },
    notifications: {
      daily: { type: Boolean, default: false },
      weekly: { type: Boolean, default: false },
      large: { type: Boolean, default: false }
    }
  }
})

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
})

// New usernames are stored in lowercase, but accounts created before that may
// still have capitals, so lookups ignore case.
const IGNORE_CASE = { locale: 'en', strength: 2 }

userSchema.statics.findByUsername = function (username) {
  return this.find({ username: username.trim() }).collation(IGNORE_CASE)
}

userSchema.statics.usernameExists = async function (username, exceptId) {
  const matches = await this.findByUsername(username)
  return matches.some(user => user.id !== exceptId)
}

userSchema.statics.isCorrectPassword = function (password, hash) {
  return bcrypt.compare(password, hash)
}

userSchema.methods.createAccessToken = function () {
  return generateAccessToken(getUserInfo(this))
}

userSchema.methods.createRefreshToken = async function () {
  const refreshToken = generateRefreshToken(getUserInfo(this))
  await new Token({
    hash: sha256(refreshToken),
    userID: this.id,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME * 1000)
  }).save()
  return refreshToken
}

const User = mongoose.model('User', userSchema)

export default User
