// 13 Run League — Service Worker
// Handles incoming push notifications and notification click events.

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: '⚡ 13-Run Alert', body: event.data?.text() ?? '' }
  }

  const title = data.title ?? '⚡ 13-Run Alert'
  const options = {
    body:              data.body ?? 'A team just scored 13 runs!',
    icon:              '/icon',
    badge:             '/icon',
    tag:               data.tag ?? 'thirteen-run',
    requireInteraction: false,
    data:              { url: data.url ?? '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if already open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})
