import jwt from 'jsonwebtoken'

export function verifyAccessToken (token) {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
}

export function verifyRefreshToken (token) {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
}
