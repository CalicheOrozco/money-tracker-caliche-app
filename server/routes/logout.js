import express from 'express'
import Token from '../schema/token.js'
import validateToken from '../auth/validateToken.js'

const router = express.Router()

router.delete('/', async (req, res) => {
  let refreshToken
  try {
    refreshToken = validateToken(req.headers)
  } catch (error) {
    return res.status(401).json({ error: error.message })
  }

  await Token.findOneAndDelete({ token: refreshToken })
  res.json({ success: 'Token removed' })
})

export default router
