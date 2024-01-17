import log from '../lib/trace.js'
import validateToken from './validateToken.js'
import { verifyAccessToken } from './verify.js'

const authenticateToken = (req, res, next) => {
  let token = null
  log.info('headers', req.headers)
  try {
    token = validateToken(req.headers)
    // log.info('Token', token);
  } catch (error) {
    log.error(error.message)
    if (error.message === 'Token not provided') {
      return res.status(401).json({ error: 'Token not provided' })
    }
    if (error.message === 'Token format invalid') {
      return res.status(401).json({ error: 'Token format invalid' })
    }
  }

  try {
    const decoded = verifyAccessToken(token)
    req.user = { ...decoded.user }
    next()
  } catch (err) {
    console.log('6 Token invalid', token, err)
    return res.status(403).json({ error: 'Token invalid' })
  }
}

export default authenticateToken
