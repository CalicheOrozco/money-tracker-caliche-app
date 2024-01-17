import express from 'express'
import { jsonResponse } from '../lib/jsonResponse.js'
import log from '../lib/trace.js'

const router = express.Router()

router.get('/', async function (req, res) {
  log.info('user', req.user)

  res.json(jsonResponse(200, req.user))
})

export default router
