import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_LIFETIME = 60 * 60
const REFRESH_TOKEN_LIFETIME = 60 * 60 * 24 * 30

function sign (payload, secret, expiresIn) {
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'HS256' })
}

export function generateAccessToken (user) {
  return sign({ user }, process.env.ACCESS_TOKEN_SECRET, ACCESS_TOKEN_LIFETIME)
}

export function generateRefreshToken (user) {
  return sign(
    { user },
    process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_LIFETIME
  )
}
