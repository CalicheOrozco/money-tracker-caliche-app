import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'
import Token from '../schema/token.js'
import User from '../schema/user.js'
import { passwordProblem } from '../lib/accountRules.js'
import { limit } from '../lib/rateLimit.js'

const router = express.Router()

router.use(authenticateToken)

// The flag is read from the database on every request, so removing it takes
// effect at once, and renaming an account never moves it to someone else.
router.use(async (req, res, next) => {
  req.account = await User.findById(req.user.id)
  if (!req.account?.admin) return res.status(403).json({ error: 'Only the app admin can do this.' })
  next()
})

const RESETS = limit('admin-reset', 10, 15 * 60 * 1000, req => req.user.id)

// Sets a new password for any account, for someone who forgot theirs. Every
// session of that account ends, including its connected assistants.
router.post('/reset-password', RESETS, async (req, res) => {
  const { username, password } = req.body
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Enter the username of the account.' })
  }
  const problem = passwordProblem(password)
  if (problem) return res.status(400).json({ error: problem })

  // Older accounts may differ only in capitals, so an exact spelling wins.
  const matches = await User.findByUsername(username)
  const target = matches.length === 1 ? matches[0] : matches.find(user => user.username === username.trim())
  if (!target) {
    return matches.length
      ? res.status(409).json({ error: 'More than one account matches that username. Use its exact spelling.' })
      : res.status(404).json({ error: `No account is called “${username.trim()}”.` })
  }

  target.password = password
  target.passwordChangedAt = new Date()
  await target.save()
  await Token.deleteMany({ userID: target.id })
  console.info(`Admin ${req.account.username} reset the password of ${target.username}`)

  const result = { username: target.username, name: target.name }
  // Resetting your own password also ended this session, so a new one comes back.
  if (target.id === req.account.id) {
    result.session = {
      accessToken: target.createAccessToken(),
      refreshToken: await target.createRefreshToken()
    }
  }
  res.json(result)
})

export default router
