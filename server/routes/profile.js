import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'
import Card from '../schema/card.js'
import { PLANNING_MODELS } from '../schema/planning.js'
import PushSubscription from '../schema/pushSubscription.js'
import Token from '../schema/token.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'

const router = express.Router()

const CURRENCIES = ['MXN', 'USD', 'CAD', 'AUD', 'EUR', 'GBP', 'COP', 'JPY']
const RANGES = ['7D', '15D', '1M', '6M', '1Y', 'All']
// A downscaled avatar fits well under this; anything larger is not one.
const MAX_PHOTO_LENGTH = 300 * 1024

function publicProfile (user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || '',
    photo: user.photo || '',
    memberSince: user._id.getTimestamp(),
    passwordChangedAt: user.passwordChangedAt,
    settings: user.settings
  }
}

function applySettings (user, settings) {
  const target = user.settings
  const { currency, defaultRange, privacyOnOpen, budget, largeAmount } = settings

  if (CURRENCIES.includes(currency)) target.currency = currency
  if (RANGES.includes(defaultRange)) target.defaultRange = defaultRange
  if (typeof privacyOnOpen === 'boolean') target.privacyOnOpen = privacyOnOpen
  if (Number.isFinite(budget) && budget >= 0) target.budget = budget
  if (Number.isFinite(largeAmount) && largeAmount >= 0) {
    target.largeAmount = largeAmount
  }
  for (const key of ['daily', 'weekly', 'large']) {
    const value = settings.notifications?.[key]
    if (typeof value === 'boolean') target.notifications[key] = value
  }
}

router.use(authenticateToken)

router.use(async (req, res, next) => {
  req.account = await User.findById(req.user.id)
  if (!req.account) return res.status(401).json({ error: 'Account not found.' })
  next()
})

router.get('/', (req, res) => {
  res.json(publicProfile(req.account))
})

router.patch('/', async (req, res) => {
  const user = req.account
  const { name, username, email, photo, settings } = req.body

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'The name must not be empty.' })
    }
    user.name = name.trim()
  }

  if (username !== undefined) {
    if (typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'The username must not be empty.' })
    }
    if (await User.usernameExists(username, user.id)) {
      return res.status(409).json({ error: 'That username is already taken.' })
    }
    user.username = username
  }

  if (email !== undefined) {
    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'The email is not valid.' })
    }
    user.email = email.trim()
  }

  if (photo !== undefined) {
    const isImage = photo === '' || /^data:image\/(jpeg|png|webp);base64,/.test(photo)
    if (typeof photo !== 'string' || !isImage || photo.length > MAX_PHOTO_LENGTH) {
      return res.status(400).json({ error: 'That photo could not be used.' })
    }
    user.photo = photo
  }

  if (settings && typeof settings === 'object') applySettings(user, settings)

  await user.save()
  res.json(publicProfile(user))
})

router.post('/password', async (req, res) => {
  const { current, next } = req.body

  if (typeof current !== 'string' || typeof next !== 'string') {
    return res.status(400).json({ error: 'Enter your current and new password.' })
  }
  if (next.length < 8) {
    return res
      .status(400)
      .json({ error: 'New password needs at least 8 characters.' })
  }
  if (!(await User.isCorrectPassword(current, req.account.password))) {
    return res.status(400).json({ error: 'Your current password is incorrect.' })
  }

  req.account.password = next
  req.account.passwordChangedAt = new Date()
  await req.account.save()
  res.json(publicProfile(req.account))
})

router.delete('/transactions', async (req, res) => {
  const { deletedCount } = await TransactionModel.deleteMany({
    userID: req.account.id
  })
  res.json({ deletedCount })
})

router.delete('/', async (req, res) => {
  const userID = req.account.id
  await Promise.all([
    TransactionModel.deleteMany({ userID }),
    Card.deleteMany({ userID }),
    PushSubscription.deleteMany({ userID }),
    Token.deleteMany({ userID }),
    ...PLANNING_MODELS.map(Model => Model.deleteMany({ userID }))
  ])
  await req.account.deleteOne()
  res.json({ success: 'Account deleted' })
})

export default router
