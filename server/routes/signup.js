import express from 'express'
import User from '../schema/user.js'
import { jsonResponse } from '../lib/jsonResponse.js'

const router = express.Router()

router.post('/', async (req, res) => {
  const { username, password, name } = req.body

  // Non-string values would otherwise reach the query as Mongo operators.
  const fields = [username, password, name]
  if (fields.some(field => typeof field !== 'string' || !field)) {
    return res.status(409).json(
      jsonResponse(409, {
        error: 'username, password, and name are required'
      })
    )
  }

  if (await User.usernameExists(username)) {
    return res.status(409).json(
      jsonResponse(409, {
        error: 'username already exists'
      })
    )
  }

  await new User({ username, password, name }).save()

  res.json(
    jsonResponse(200, {
      message: 'User created successfully'
    })
  )
})

export default router
