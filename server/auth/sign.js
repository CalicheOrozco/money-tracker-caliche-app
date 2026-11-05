import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_LIFETIME = 60 * 60
export const REFRESH_TOKEN_LIFETIME = 60 * 60 * 24 * 30

function sign (payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' })
}

export function generateAccessToken (user) {
  return sign({ user }, process.env.ACCESS_TOKEN_SECRET, ACCESS_TOKEN_LIFETIME)
}

// The random id keeps two sign-ins in the same second from getting the same token.
export function generateRefreshToken (user) {
  return jwt.sign({ user }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_LIFETIME,
    algorithm: 'HS256',
    jwtid: randomUUID()
  })
}
