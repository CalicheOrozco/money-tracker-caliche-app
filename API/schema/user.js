import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { generateAccessToken, generateRefreshToken } from '../auth/sign.js'
import getUserInfo from '../lib/getUserInfo.js'
import Token from '../schema/token.js'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }
})

userSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    try {
      const salt = await bcrypt.genSalt(10)
      const hash = await bcrypt.hash(this.password, salt)
      this.password = hash
      next()
    } catch (error) {
      next(error)
    }
  } else {
    next()
  }
})

userSchema.statics.usernameExists = async function (username) {
  const result = await this.model('User').find({ username: username })
  return result.length > 0
}

userSchema.statics.isCorrectPassword = async function (password, hash) {
  const same = await bcrypt.compare(password, hash)
  return same
}

userSchema.statics.createAccessToken = function () {
  return generateAccessToken(getUserInfo(this))
}

userSchema.statics.createRefreshToken = async function () {
  const refreshToken = generateRefreshToken(getUserInfo(this))

  try {
    await new Token({ token: refreshToken }).save()
    return refreshToken
  } catch (error) {
    console.error(error)
    throw new Error('Error creating token')
  }
}

const User = mongoose.model('User', userSchema)

export default User
