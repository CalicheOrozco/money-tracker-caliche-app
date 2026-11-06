import express from 'express'
import { limit } from '../lib/rateLimit.js'
import { reportError } from '../lib/reportError.js'

const router = express.Router()

// Errors the browser catches. Anyone can send one, so each address has a small quota
// and only the message, stack and screen are kept.
const REPORTS = limit('client-error', 20, 60 * 60 * 1000)

const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '')

router.post('/', REPORTS, async (req, res) => {
  const message = text(req.body.message, 300).trim()
  if (!message) return res.status(400).json({ error: 'The report needs a message.' })

  const error = { message, stack: text(req.body.stack, 4000) }
  // Only the path: query strings can hold searches or other personal text.
  const path = text(req.body.path, 200).split('?')[0]
  await reportError(error, { source: 'client', path })
  res.status(204).end()
})

export default router
