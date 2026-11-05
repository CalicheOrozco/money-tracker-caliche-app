import { sha256 } from '../lib/secureHash.js'
import Token from '../schema/token.js'

// Finds the stored session for a refresh token. Sessions saved before tokens were
// hashed are upgraded the first time they are used.
export default async function findRefreshToken (refreshToken) {
  const hash = sha256(refreshToken)
  const stored = await Token.findOne({ hash })
  if (stored) return stored

  const legacy = await Token.findOne({ token: refreshToken })
  if (!legacy) return null
  legacy.hash = hash
  legacy.token = undefined
  await legacy.save()
  return legacy
}
