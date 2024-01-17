import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

function sign (payload, isAccessToken) {
  console.log('payload', payload)
  return jwt.sign(
    payload,
    isAccessToken
      ? process.env.ACCESS_TOKEN_SECRET
      : process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: 3600,
      algorithm: 'HS256'
    }
  )
}

// Función para generar un token de acceso utilizando jsonwebtoken
export function generateAccessToken (user) {
  return sign({ user }, true)
}

export function generateRefreshToken (user) {
  return sign({ user }, false)
}
