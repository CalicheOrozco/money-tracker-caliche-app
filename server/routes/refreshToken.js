import express from 'express'
import { jsonResponse } from '../lib/jsonResponse.js'
import { verifyRefreshToken } from '../auth/verify.js'
import { generateAccessToken } from '../auth/sign.js'
import getUserInfo from '../lib/getUserInfo.js'
import findRefreshToken from '../auth/findRefreshToken.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { refreshToken } = req.body

  if (typeof refreshToken !== 'string' || !refreshToken) {
    return res.status(401).json({ error: 'Unprovided update token.' })
  }

  const tokenDocument = await findRefreshToken(refreshToken)
  if (!tokenDocument) {
    return res.status(403).json({ error: 'Invalid refresh token.' })
  }

  try {
    const payload = verifyRefreshToken(refreshToken)
    const accessToken = generateAccessToken(getUserInfo(payload.user))
    res.json(jsonResponse(200, { accessToken }))
  } catch {
    return res.status(403).json({ error: 'Invalid refresh token.' })
  }
})

export default router
