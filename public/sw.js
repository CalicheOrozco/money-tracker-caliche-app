// Handles push notifications only. It does not cache anything.
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Money Tracker', {
      body: data.body || '',
      icon: '/icon192x192.png',
      badge: '/icon96x96.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(windows => {
      const open = windows.find(w => 'focus' in w)
      if (open) {
        open.navigate(url)
        return open.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
