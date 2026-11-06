import express from 'express'
import adminRoute from './routes/admin.js'
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

// Without these the API cannot work, so it says which ones are missing instead of
// failing later in a confusing way.
const REQUIRED_ENV = ['MONGODB_URI', 'ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET']
const missingEnv = REQUIRED_ENV.filter(name => !process.env[name])
if (missingEnv.length) console.error(`Missing environment variables: ${missingEnv.join(', ')}`)

const app = express()
app.disable('x-powered-by')
// Vercel sits in front, so the client address comes from its forwarding headers.
app.set('trust proxy', true)

// The largest body is a profile photo, which is kept under 300kb.
app.use(express.json({ limit: '1mb' }))

// Express 5 leaves req.body undefined when a request has no JSON body.
app.use((req, res, next) => {
  req.body ??= {}
  next()
})

// Settings the browser needs at runtime. Kept out of the build so they can be
// stored as sensitive variables on Vercel.
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ brandfetchClientId: process.env.BRANDFETCH_CLIENT_ID || '' })
})

app.use('/api', async (req, res, next) => {
  if (missingEnv.length) return res.status(503).json({ error: 'The server is not configured.' })
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
app.use('/api/profile', profileRoute)
app.use('/api/admin', adminRoute)
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
