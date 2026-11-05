import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'
import { pushConfigured } from '../lib/push.js'
import PushSubscription from '../schema/pushSubscription.js'

const router = express.Router()

// Only real browser push services, so the server never posts to an address a user picked.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/]
const MAX_DEVICES = 10

function validEndpoint (endpoint) {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some(host => host.test(url.hostname))
  } catch {
    return false
  }
}

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
    typeof keys?.auth !== 'string' ||
    endpoint.length > 1000 || keys.p256dh.length > 200 || keys.auth.length > 100 ||
    !validEndpoint(endpoint)
  ) {
    return res.status(400).json({ error: 'Invalid subscription.' })
  }

  const known = await PushSubscription.exists({ endpoint, userID: req.user.id })
  if (!known && (await PushSubscription.countDocuments({ userID: req.user.id })) >= MAX_DEVICES) {
    return res.status(400).json({ error: `Notifications can be on in up to ${MAX_DEVICES} devices.` })
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
