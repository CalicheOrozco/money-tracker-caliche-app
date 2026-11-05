import validateToken from './validateToken.js'
import { verifyAccessToken } from './verify.js'

const authenticateToken = (req, res, next) => {
  let token
  try {
    token = validateToken(req.headers)
  } catch (error) {
    return res.status(401).json({ error: error.message })
  }

  try {
    req.user = { ...verifyAccessToken(token).user }
  } catch {
    return res.status(403).json({ error: 'Token invalid' })
  }

  next()
}

export default authenticateToken
