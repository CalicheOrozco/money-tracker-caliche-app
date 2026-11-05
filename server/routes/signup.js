import express from 'express'
import User from '../schema/user.js'
import { jsonResponse } from '../lib/jsonResponse.js'
import { nameProblem, passwordProblem, usernameProblem } from '../lib/accountRules.js'
import { limit } from '../lib/rateLimit.js'

const router = express.Router()

const fail = (res, status, error) => res.status(status).json(jsonResponse(status, { error }))

router.post('/', limit('signup-ip', 10, 60 * 60 * 1000), async (req, res) => {
  const { username, password, name } = req.body

  // Non-string values would otherwise reach the query as Mongo operators.
  if ([username, password, name].some(field => typeof field !== 'string' || !field)) {
    return fail(res, 409, 'username, password, and name are required')
  }
  const problem = usernameProblem(username) || nameProblem(name) || passwordProblem(password)
  if (problem) return fail(res, 400, problem)

  if (await User.usernameExists(username)) {
    return fail(res, 409, 'username already exists')
  }

  await new User({ username, password, name }).save()

  res.json(
    jsonResponse(200, {
      message: 'User created successfully'
    })
  )
})

export default router
