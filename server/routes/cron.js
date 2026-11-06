import express from 'express'
import { cardDues } from '../../src/lib/cardCycle.js'
import { byCategoryEntries } from '../../src/lib/splits.js'
import { reportError } from '../lib/reportError.js'
import { priceValue } from '../lib/price.js'
import { sendToUser } from '../lib/push.js'
import Card from '../schema/card.js'
import { Transfer } from '../schema/planning.js'
import PushSubscription from '../schema/pushSubscription.js'
import TransactionModel from '../schema/transaction.js'
import User from '../schema/user.js'

const router = express.Router()

const DAY = 24 * 60 * 60 * 1000
// Transactions are stored at midnight UTC of their calendar day, so days are compared
// as dates in the zone the reminders are meant for.
const TIMEZONE = process.env.TIMEZONE || 'America/Moncton'

function localDay (now) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return new Date(`${key}T00:00:00Z`)
}

const isExpense = transaction => priceValue(transaction.price) < 0
const amountOf = transaction => Math.abs(priceValue(transaction.price))

async function weeklyPayload (userID, now) {
  const today = localDay(now)
  const transactions = await TransactionModel.find({
    userID,
    datetime: { $gte: new Date(today.getTime() - 6 * DAY), $lt: new Date(today.getTime() + DAY) }
  })

  let income = 0
  let expenses = 0
  const categories = {}
  for (const transaction of transactions) {
    if (isExpense(transaction)) expenses += amountOf(transaction)
    else income += amountOf(transaction)
  }
  // Split purchases count in each of their categories.
  const parts = byCategoryEntries(transactions.map(t => ({ amount: priceValue(t.price), category: t.category || 'Other', splits: t.splits })))
  for (const part of parts) {
    if (part.amount < 0) categories[part.category] = (categories[part.category] || 0) - part.amount
  }

  const [top] = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const summary = `Income ${income.toFixed(2)}, expenses ${expenses.toFixed(2)}.`

  return {
    title: 'Your week in money',
    body: top ? `${summary} Top category: ${top[0]}.` : summary,
    url: '/charts'
  }
}

function loggedToday (userID, now) {
  const today = localDay(now)
  return TransactionModel.exists({
    userID,
    datetime: { $gte: today, $lt: new Date(today.getTime() + DAY) }
  })
}

// Reminders three days before and on the day a credit card payment is due, while
// something is still left to pay on the statement.
const REMIND_DAYS = [3, 0]

async function cardDueReminders (userID, now) {
  const cards = (await Card.find({ userID, hidden: false, dueDay: { $ne: null } }).lean())
    .filter(card => !card.type || card.type === 'credit')
  if (!cards.length) return []
  const names = cards.map(card => card.name)
  const [transactions, transfers] = await Promise.all([
    TransactionModel.find({ userID, card: { $in: names } }).select('price datetime card').lean(),
    Transfer.find({ userID, to: { $in: names } }).lean()
  ])
  const today = localDay(now).toISOString().slice(0, 10)
  return cardDues(
    cards,
    transactions.map(t => ({ id: String(t._id), amount: priceValue(t.price), date: t.datetime.toISOString().slice(0, 10), card: t.card })),
    transfers.map(t => ({ id: String(t._id), createdId: String(t._id), transfer: true, from: t.from, to: t.to, value: t.amount, date: t.date })),
    today
  ).filter(due => due.issued && due.amountDue > 0 && REMIND_DAYS.includes(due.daysLeft))
}

const dueText = due => {
  const day = new Date(`${due.dueDate}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' })
  return due.daysLeft === 0
    ? { title: `${due.card} payment due today`, body: `Pay ${due.amountDue.toFixed(2)} today to avoid interest.` }
    : { title: `${due.card} payment due ${day}`, body: `Pay ${due.amountDue.toFixed(2)} by ${day} to avoid interest.` }
}

async function notifyUser (user, now, isWeeklyRun) {
  const { notifications } = user.settings
  let sent = 0

  if (notifications.daily && !(await loggedToday(user.id, now))) {
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

  if (notifications.cardDue) {
    for (const due of await cardDueReminders(user.id, now)) {
      await sendToUser(user.id, { ...dueText(due), url: '/cards' })
      sent++
    }
  }

  return sent
}

// Vercel Cron calls this once a day (see vercel.json) and sends CRON_SECRET as a
// bearer token. The schedule is in UTC, 01:00, which is the evening before in the
// Americas, so "today" is that local day and the weekly summary goes out on Sunday.
router.get('/notifications', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Not allowed.' })
  }

  const now = new Date()
  const userIDs = await PushSubscription.distinct('userID')
  const users = await User.find({ _id: { $in: userIDs } })
  // One user's failure must not stop everyone else's reminders.
  const results = await Promise.all(
    users.map(user => notifyUser(user, now, localDay(now).getUTCDay() === 0).catch(error => {
      reportError(error, { source: 'cron', path: '/api/cron/notifications' })
      return 0
    }))
  )

  res.json({ sent: results.reduce((total, count) => total + count, 0) })
})

export default router
