import express from 'express'
import authenticateToken from './auth/authenticateToken.js'
import brandRoute from './routes/brand.js'
import connectDB from './lib/connectDB.js'
import { jsonResponse } from './lib/jsonResponse.js'
import signupRoute from './routes/signup.js'
import loginRoute from './routes/login.js'
import meRoute from './routes/me.js'
import logoutRoute from './routes/logout.js'
import refreshTokenRoute from './routes/refreshToken.js'
import cronRoute from './routes/cron.js'
import profileRoute from './routes/profile.js'
import pushRoute from './routes/push.js'
import transactionsRoute from './routes/transactions.js'
import userRoute from './routes/user.js'

const app = express()

// Bank statement uploads go well past the 100kb default. Vercel caps request
// bodies at 4.5mb, so this is the largest size that can actually arrive.
app.use(express.json({ limit: '4mb' }))

// Express 5 leaves req.body undefined when a request has no JSON body.
app.use((req, res, next) => {
  req.body ??= {}
  next()
})

app.get('/api/test', (req, res) => {
  res.json('Hello World!')
})

// Settings the browser needs at runtime. Kept out of the build so they can be
// stored as sensitive variables on Vercel.
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ brandfetchClientId: process.env.BRANDFETCH_CLIENT_ID || '' })
})

app.use('/api', async (req, res, next) => {
  try {
    await connectDB()
    next()
  } catch (error) {
    console.error('Could not connect to MongoDB:', error.message)
    res.status(503).json({ error: 'Database unavailable' })
  }
})

app.use('/api/signup', signupRoute)
app.use('/api/login', loginRoute)
app.use('/api/signout', logoutRoute)
app.use('/api/refresh-token', refreshTokenRoute)
app.use('/api/user', authenticateToken, userRoute)
app.use('/api/profile', profileRoute)
app.use('/api/me', meRoute)
app.use('/api/push', pushRoute)
app.use('/api/cron', cronRoute)
app.use('/api', brandRoute)
app.use('/api', transactionsRoute)

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// The frontend reads `error` on transaction routes and `body.error` on auth
// routes, so failures carry both.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)

  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error(err)

  const error = status >= 500 ? 'Internal server error' : err.message
  res.status(status).json({ error, ...jsonResponse(status, { error }) })
})

export default app
