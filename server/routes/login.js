import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../schema/user.js'
import { jsonResponse } from '../lib/jsonResponse.js'
import getUserInfo from '../lib/getUserInfo.js'
import { clear, clientIp, hit, isBlocked, limit, tooMany } from '../lib/rateLimit.js'

const router = express.Router()

const WINDOW = 15 * 60 * 1000
const FAILURES_PER_ACCOUNT = 10
// Compared against when the username does not exist, so both cases take as long.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)
const INVALID = 'Incorrect username or password.'

router.post('/', limit('login-ip', 30, WINDOW, clientIp), async (req, res) => {
  const { username, password } = req.body

  // Non-string values would otherwise reach the query as Mongo operators.
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim()) {
    return res.status(400).json(jsonResponse(400, { error: 'username and password are required' }))
  }

  const accountKey = `login-user:${username.trim().toLowerCase()}`
  if (await isBlocked(accountKey, FAILURES_PER_ACCOUNT)) return tooMany(res)

  const candidates = await User.findByUsername(username)

  // Older accounts could differ only by case, so the password picks between them.
  let user = null
  for (const candidate of candidates) {
    if (await User.isCorrectPassword(password, candidate.password)) {
      user = candidate
      break
    }
  }
  if (candidates.length === 0) await bcrypt.compare(password, DUMMY_HASH)

  if (!user) {
    await hit(accountKey, FAILURES_PER_ACCOUNT, WINDOW)
    return res.status(401).json(jsonResponse(401, { error: INVALID }))
  }

  await clear(accountKey)
  const accessToken = user.createAccessToken()
  const refreshToken = await user.createRefreshToken()

  res.json(
    jsonResponse(200, {
      accessToken,
      refreshToken,
      user: getUserInfo(user)
    })
  )
})

export default router
