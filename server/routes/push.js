import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'
import { pushConfigured } from '../lib/push.js'
import PushSubscription from '../schema/pushSubscription.js'

const router = express.Router()

router.get('/key', (req, res) => {
  if (!pushConfigured()) {
    return res.status(503).json({ error: 'Notifications are not set up yet.' })
  }
  res.json({ key: process.env.VAPID_PUBLIC_KEY })
})

router.post('/subscribe', authenticateToken, async (req, res) => {
  const { endpoint, keys } = req.body

  if (
    typeof endpoint !== 'string' ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys?.auth !== 'string'
  ) {
    return res.status(400).json({ error: 'Invalid subscription.' })
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userID: req.user.id, endpoint, keys },
    { upsert: true }
  )
  res.json({ success: true })
})

router.post('/unsubscribe', authenticateToken, async (req, res) => {
  const { endpoint } = req.body
  if (typeof endpoint === 'string') {
    await PushSubscription.deleteOne({ endpoint, userID: req.user.id })
  }
  res.json({ success: true })
})

export default router
