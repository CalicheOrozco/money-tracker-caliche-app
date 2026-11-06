import ErrorReport from '../schema/errorReport.js'
import User from '../schema/user.js'
import { sendToUser } from './push.js'
import { sha256 } from './secureHash.js'

const DAY = 24 * 60 * 60 * 1000
const KEEP = 30 * DAY
// Browsers can send anything, so their alerts are capped across all errors.
const CLIENT_ALERTS_PER_DAY = 5

const firstFrame = stack => (stack.split('\n').find(line => line.trim().startsWith('at ')) || '').trim()

// Admins hear about an error the first time it happens, then at most once a day while
// it keeps happening.
async function alertAdmins (report) {
  const now = new Date()
  if (report.source === 'client') {
    const recent = await ErrorReport.countDocuments({ source: 'client', notifiedAt: { $gt: new Date(now - DAY) } })
    if (recent >= CLIENT_ALERTS_PER_DAY) return
  }
  // Only one request wins the right to notify, even when many fail at once.
  const claimed = await ErrorReport.updateOne(
    { _id: report._id, $or: [{ notifiedAt: null }, { notifiedAt: { $lt: new Date(now - DAY) } }] },
    { $set: { notifiedAt: now } }
  )
  if (claimed.modifiedCount !== 1) return

  const admins = await User.find({ admin: true }).select('_id').lean()
  const where = report.source === 'client' ? 'in the app' : report.source === 'cron' ? 'in a scheduled job' : 'on the server'
  await Promise.all(admins.map(admin => sendToUser(String(admin._id), {
    title: report.count > 1 ? `Error ${where} keeps happening` : `New error ${where}`,
    body: report.message.slice(0, 140),
    url: '/admin/errors'
  })))
}

// Saves an error for the admin to see. It never throws: reporting a problem must not
// cause another one.
export async function reportError (error, { source = 'server', path = '', userID = '' } = {}) {
  try {
    const message = String(error?.message || error || 'Unknown error').slice(0, 300)
    const stack = String(error?.stack || '').slice(0, 4000)
    const now = new Date()
    const report = await ErrorReport.findOneAndUpdate(
      { fingerprint: sha256(`${source}|${message}|${firstFrame(stack)}`) },
      {
        $inc: { count: 1 },
        $set: { source, message, stack, path: String(path).slice(0, 200), lastAt: now, expiresAt: new Date(now.getTime() + KEEP), ...(userID && { userID: String(userID) }) },
        $setOnInsert: { firstAt: now }
      },
      { upsert: true, returnDocument: 'after' }
    )
    await alertAdmins(report)
  } catch (failure) {
    console.error('Could not save an error report:', failure.message)
  }
}

// Waits for the report, but never longer than `ms`, so a slow database can't hold
// up the response to the user.
export const reportErrorWithin = (error, details, ms = 3000) =>
  Promise.race([reportError(error, details), new Promise(resolve => setTimeout(resolve, ms).unref?.())])
