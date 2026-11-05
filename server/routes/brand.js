import express from 'express'
import authenticateToken from '../auth/authenticateToken.js'

const router = express.Router()

const DAY = 24 * 60 * 60 * 1000
const cache = new Map()

// The free Brand API allowance is small, so each domain is asked once a day at
// most per server instance. Only colors are returned to the app.
router.get('/brand-colors/:domain', authenticateToken, async (req, res) => {
  const key = process.env.BRANDFETCH_API_KEY
  // Without a key the feature is simply off: no colors, no error.
  if (!key) return res.json({ colors: [], enabled: false })

  const domain = String(req.params.domain).toLowerCase()
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    return res.status(400).json({ error: 'The domain is not valid.' })
  }

  const cached = cache.get(domain)
  if (cached && Date.now() - cached.at < DAY) return res.json({ colors: cached.colors })

  const response = await fetch(`https://api.brandfetch.io/v2/brands/domain/${domain}`, {
    headers: { Authorization: `Bearer ${key}` }
  })

  if (response.status === 429) {
    return res.status(429).json({ error: 'Brand colors are used up for now. Pick one of the colors below.' })
  }
  if (response.status === 404) {
    cache.set(domain, { at: Date.now(), colors: [] })
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

  cache.set(domain, { at: Date.now(), colors })
  res.json({ colors })
})

export default router
