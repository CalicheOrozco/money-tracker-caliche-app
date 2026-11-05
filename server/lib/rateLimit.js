import mongoose from 'mongoose'

// Counters live in the database because each serverless instance has its own memory.
const hitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 }
})
const Hit = mongoose.models.RateLimit || mongoose.model('RateLimit', hitSchema)

export const clientIp = req =>
  String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim()

// Counts one hit for `key` and tells whether it went over `max` within the window.
export async function hit (key, max, windowMs) {
  const now = new Date()
  const current = await Hit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: 'after' }
  )
  if (current) return current.count > max
  await Hit.updateOne(
    { key },
    { $set: { count: 1, expiresAt: new Date(now.getTime() + windowMs) } },
    { upsert: true }
  ).catch(() => {})
  return false
}

export async function isBlocked (key, max) {
  const current = await Hit.findOne({ key, expiresAt: { $gt: new Date() } })
  return (current?.count || 0) >= max
}

export const clear = key => Hit.deleteOne({ key })

const tooMany = res => {
  const error = 'Too many attempts. Wait a few minutes and try again.'
  return res.status(429).json({ error, statuscode: 429, body: { error } })
}

// Express middleware: at most `max` requests per window for each value of `by`.
export function limit (name, max, windowMs, by = clientIp) {
  return async (req, res, next) => {
    if (await hit(`${name}:${by(req)}`, max, windowMs)) return tooMany(res)
    next()
  }
}

export { tooMany }
