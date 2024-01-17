import express from 'express'
import User from '../schema/user.js'
import { jsonResponse } from '../lib/jsonResponse.js'
import getUserInfo from '../lib/getUserInfo.js'

const router = express.Router()

router.post('/', async (req, res, next) => {
  const { username, password } = req.body

  try {
    let user = new User()
    const userExists = await User.usernameExists(username)

    if (userExists) {
      user = await User.findOne({ username })

      const passwordCorrect = await User.isCorrectPassword(
        password,
        user.password
      )

      if (passwordCorrect) {
        const accessToken = User.createAccessToken()
        const refreshToken = await User.createRefreshToken()

        console.log({ accessToken, refreshToken })

        return res.json(
          jsonResponse(200, {
            accessToken,
            refreshToken,
            user: getUserInfo(user)
            
          })
        )
      } else {
        return res.status(401).json(
          jsonResponse(401, {
            error: 'username and/or password incorrect'
          })
        )
      }
    } else {
      return res.status(401).json(
        jsonResponse(401, {
          error: 'username does not exist'
        })
      )
    }
  } catch (err) {
    console.log(err)
  }
})

export default router
