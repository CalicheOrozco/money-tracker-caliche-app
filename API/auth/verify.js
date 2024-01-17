import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

export function verifyAccessToken (token) {
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  return decoded
}

export function verifyRefreshToken (token) {
  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
  return decoded
}
