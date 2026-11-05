import express from 'express'
import { sendToUser } from '../lib/push.js'
import PushSubscription from '../schema/pushSubscription.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'

const router = express.Router()

const DAY = 24 * 60 * 60 * 1000

function isExpense (transaction) {
  return String(transaction.price).startsWith('-')
}

function amountOf (transaction) {
  return Math.abs(parseFloat(String(transaction.price).replace(/[,+]/g, ''))) || 0
}

async function weeklyPayload (userID, now) {
  const transactions = await TransactionModel.find({
    userID,
    datetime: { $gte: new Date(now - 7 * DAY), $lte: now }
  })

  let income = 0
  let expenses = 0
  const categories = {}
  for (const transaction of transactions) {
    const amount = amountOf(transaction)
    if (isExpense(transaction)) {
      expenses += amount
      const category = transaction.category || 'Other'
      categories[category] = (categories[category] || 0) + amount
    } else {
      income += amount
    }
  }

  const [top] = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const summary = `Income ${income.toFixed(2)}, expenses ${expenses.toFixed(2)}.`

  return {
    title: 'Your week in money',
    body: top ? `${summary} Top category: ${top[0]}.` : summary,
    url: '/charts'
  }
}

function loggedRecently (userID, now) {
  return TransactionModel.exists({
    userID,
    datetime: { $gte: new Date(now - DAY), $lte: now }
  })
}

async function notifyUser (user, now, isWeeklyRun) {
  const { notifications } = user.settings
  let sent = 0

  if (notifications.daily && !(await loggedRecently(user.id, now))) {
    await sendToUser(user.id, {
      title: 'Log today’s spending',
      body: 'You haven’t added anything today. It only takes a minute.',
      url: '/'
    })
    sent++
  }

  if (notifications.weekly && isWeeklyRun) {
    await sendToUser(user.id, await weeklyPayload(user.id, now))
    sent++
  }

  return sent
}

// Vercel Cron calls this once a day (see vercel.json) and sends CRON_SECRET as a
// bearer token. The schedule is in UTC: the Monday run lands on Sunday evening
// in the Americas, which is when the weekly summary is useful.
router.get('/notifications', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Not allowed.' })
  }

  const now = new Date()
  const userIDs = await PushSubscription.distinct('userID')
  const users = await User.find({ _id: { $in: userIDs } })
  const results = await Promise.all(
    users.map(user => notifyUser(user, now, now.getUTCDay() === 1))
  )

  res.json({ sent: results.reduce((total, count) => total + count, 0) })
})

export default router
