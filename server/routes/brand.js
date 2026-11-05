import express from 'express'
import mongoose from 'mongoose'
import authenticateToken from '../auth/authenticateToken.js'
import { limit } from '../lib/rateLimit.js'

const router = express.Router()

// Kept in the database so every server instance shares it, and dropped after a day.
const BrandColors = mongoose.models.BrandColors || mongoose.model('BrandColors', new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  colors: { type: [{ hex: String, type: { type: String } }], default: [] },
  at: { type: Date, default: Date.now, expires: 24 * 60 * 60 }
}))
const cache = {
  get: async domain => BrandColors.findOne({ domain }).lean(),
  set: (domain, colors) => BrandColors.updateOne({ domain }, { $set: { colors: colors.map(({ hex, type }) => ({ hex, type })), at: new Date() } }, { upsert: true })
}

// The free Brand API allowance is small, so each domain is asked once a day at
// most. Only colors are returned to the app.
router.get('/brand-colors/:domain', authenticateToken, limit('brand-colors', 60, 60 * 60 * 1000, req => req.user.id), async (req, res) => {
  const key = process.env.BRANDFETCH_API_KEY
  // Without a key the feature is simply off: no colors, no error.
  if (!key) return res.json({ colors: [], enabled: false })

  const domain = String(req.params.domain).toLowerCase()
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return res.status(400).json({ error: 'The domain is not valid.' })
  }

  const cached = await cache.get(domain)
  if (cached) return res.json({ colors: cached.colors.map(({ hex, type }) => ({ hex, type })) })

  const response = await fetch(`https://api.brandfetch.io/v2/brands/domain/${domain}`, {
    headers: { Authorization: `Bearer ${key}` }
  })

  if (response.status === 429) {
    return res.status(429).json({ error: 'Brand colors are used up for now. Pick one of the colors below.' })
  }
  if (response.status === 404) {
    await cache.set(domain, [])
    return res.json({ colors: [] })
  }
  if (!response.ok) {
    console.error('Brand colors failed:', response.status)
    return res.status(502).json({ error: 'Brand colors are not available right now.' })
  }

  const data = await response.json()
  const seen = new Set()
  const colors = (Array.isArray(data.colors) ? data.colors : [])
    .filter(c => typeof c?.hex === 'string' && /^#[0-9a-f]{6}$/i.test(c.hex))
    .map(c => ({ hex: c.hex.toLowerCase(), type: c.type || '' }))
    .filter(c => !seen.has(c.hex) && seen.add(c.hex))
    .slice(0, 8)

  await cache.set(domain, colors)
  res.json({ colors })
})

export default router
