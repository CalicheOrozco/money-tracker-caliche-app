import express from 'express'
import findRefreshToken from '../auth/findRefreshToken.js'
import validateToken from '../auth/validateToken.js'

const router = express.Router()

router.delete('/', async (req, res) => {
  let refreshToken
  try {
    refreshToken = validateToken(req.headers)
  } catch (error) {
    return res.status(401).json({ error: error.message })
  }

  const stored = await findRefreshToken(refreshToken)
  await stored?.deleteOne()
  res.json({ success: 'Token removed' })
})

export default router
