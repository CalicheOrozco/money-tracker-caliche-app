import { api, publicRequest } from './api.js'

function urlBase64ToBytes (value) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

export function registerServiceWorker () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker failed to register:', error)
    })
  }
}

export async function enablePush () {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error(
      'This browser cannot receive notifications. On iPhone, add the app to your Home Screen first.'
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked. Allow them in your browser settings.')
  }

  const { key } = await publicRequest('/push/key')
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(key)
    }))

  await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() })
}

export async function disablePush () {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await api('/push/unsubscribe', {
    method: 'POST',
    body: { endpoint: subscription.endpoint }
  })
  await subscription.unsubscribe()
}
