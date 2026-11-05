import webpush from 'web-push'
import PushSubscription from '../schema/pushSubscription.js'

export function pushConfigured () {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

// Failures are logged and never thrown: a notification must not break the request
// that triggered it. Subscriptions the push service reports as gone are removed.
export async function sendToUser (userID, payload) {
  if (!pushConfigured()) return

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const subscriptions = await PushSubscription.find({ userID })

  await Promise.all(
    subscriptions.map(async ({ endpoint, keys }) => {
      try {
        await webpush.sendNotification(
          { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
          JSON.stringify(payload)
        )
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint })
        } else {
          console.error('Push failed:', error.statusCode || error.message)
        }
      }
    })
  )
}
