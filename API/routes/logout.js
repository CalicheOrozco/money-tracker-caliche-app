import express from 'express'
import Token from '../schema/token.js'
import validateToken from '../auth/validateToken.js'

const router = express.Router()

router.delete('/', async function (req, res, next) {
  try {
    console.log('req.headers', req.headers)
    const refreshToken = validateToken(req.headers)

    await Token.findOneAndDelete({ token: refreshToken })
    res.json({
      success: 'Token removed'
    })
  } catch (ex) {
    console.log(ex)
    return next(new Error('Error logging out the user ' + ex.message))
  }
})

export default router
