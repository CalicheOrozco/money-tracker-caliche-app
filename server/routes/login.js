import express from 'express'
import User from '../schema/user.js'
import { jsonResponse } from '../lib/jsonResponse.js'
import getUserInfo from '../lib/getUserInfo.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { username, password } = req.body

  // Non-string values would otherwise reach the query as Mongo operators.
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json(
      jsonResponse(400, {
        error: 'username and password are required'
      })
    )
  }

  const candidates = await User.findByUsername(username)

  if (candidates.length === 0) {
    return res.status(401).json(
      jsonResponse(401, {
        error: 'username does not exist'
      })
    )
  }

  // Older accounts could differ only by case, so the password picks between them.
  let user = null
  for (const candidate of candidates) {
    if (await User.isCorrectPassword(password, candidate.password)) {
      user = candidate
      break
    }
  }

  if (!user) {
    return res.status(401).json(
      jsonResponse(401, {
        error: 'username and/or password incorrect'
      })
    )
  }

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
