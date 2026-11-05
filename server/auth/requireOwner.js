import authenticateToken from './authenticateToken.js'

// For routes addressed by user id: the token must belong to that same user.
const requireOwner = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!req.user.id || req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Not allowed.' })
    }
    next()
  })
}

export default requireOwner
