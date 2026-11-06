import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'
import Card from '../schema/card.js'
import { PLANNING_MODELS, Transfer, TransferDismissal } from '../schema/planning.js'
import PushSubscription from '../schema/pushSubscription.js'
import Token from '../schema/token.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'
import { EMAIL_MAX, nameProblem, passwordProblem, usernameProblem } from '../lib/accountRules.js'
import { limit } from '../lib/rateLimit.js'

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
    ...(user.admin && { admin: true }),
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
  for (const key of ['daily', 'weekly', 'large', 'cardDue']) {
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
    const problem = nameProblem(name)
    if (problem) return res.status(400).json({ error: problem })
    user.name = name.trim()
  }

  if (username !== undefined) {
    const problem = usernameProblem(username)
    if (problem) return res.status(400).json({ error: problem })
    if (await User.usernameExists(username, user.id)) {
      return res.status(409).json({ error: 'That username is already taken.' })
    }
    user.username = username
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim().length > EMAIL_MAX) {
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

// Everything the account has, as one JSON file the user keeps. Sessions, push
// subscriptions and the password are left out.
const EXPORTS = limit('data-export', 10, 60 * 60 * 1000, req => req.user.id)

router.get('/export', EXPORTS, async (req, res) => {
  const userID = req.account.id
  const strip = doc => {
    const copy = { ...doc }
    delete copy.userID
    delete copy.__v
    return copy
  }
  const [transactions, cards, ...planning] = await Promise.all([
    TransactionModel.find({ userID }).sort({ datetime: 1 }).lean(),
    Card.find({ userID }).lean(),
    ...PLANNING_MODELS.map(Model => Model.find({ userID }).lean())
  ])
  const collections = Object.fromEntries(PLANNING_MODELS.map((Model, i) => [Model.collection.collectionName, planning[i].map(strip)]))
  res.set('Cache-Control', 'no-store')
  res.json({
    app: 'Money Tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: publicProfile(req.account),
    transactions: transactions.map(strip),
    cards: cards.map(strip),
    ...collections
  })
})

// Destructive actions ask for the password again, so a stolen session or a
// connected assistant cannot run them alone.
const PASSWORD_CHECKS = limit('password-check', 10, 15 * 60 * 1000, req => req.user.id)

async function requirePassword (req, res, next) {
  const { password } = req.body
  if (typeof password !== 'string' || !(await User.isCorrectPassword(password, req.account.password))) {
    return res.status(400).json({ error: 'Your password is incorrect.' })
  }
  next()
}

router.post('/password', PASSWORD_CHECKS, async (req, res) => {
  const { current, next } = req.body

  if (typeof current !== 'string' || typeof next !== 'string') {
    return res.status(400).json({ error: 'Enter your current and new password.' })
  }
  const problem = passwordProblem(next)
  if (problem) return res.status(400).json({ error: problem.replace('The password', 'New password') })
  if (!(await User.isCorrectPassword(current, req.account.password))) {
    return res.status(400).json({ error: 'Your current password is incorrect.' })
  }

  req.account.password = next
  req.account.passwordChangedAt = new Date()
  await req.account.save()

  // Every other session ends, including connected assistants. This device gets a new one.
  await Token.deleteMany({ userID: req.account.id })
  const session = {
    accessToken: req.account.createAccessToken(),
    refreshToken: await req.account.createRefreshToken()
  }
  res.json({ ...publicProfile(req.account), session })
})

router.delete('/transactions', PASSWORD_CHECKS, requirePassword, async (req, res) => {
  const userID = req.account.id
  const [{ deletedCount }] = await Promise.all([
    TransactionModel.deleteMany({ userID }),
    Transfer.deleteMany({ userID }),
    TransferDismissal.deleteMany({ userID })
  ])
  res.json({ deletedCount })
})

router.delete('/', PASSWORD_CHECKS, requirePassword, async (req, res) => {
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
