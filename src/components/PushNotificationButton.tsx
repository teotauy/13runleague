'use client'

import { useEffect, useState } from 'react'

type State = 'unsupported' | 'loading' | 'blocked' | 'subscribed' | 'unsubscribed'

export default function PushNotificationButton() {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'denied') {
      setState('blocked')
      return
    }
    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? 'subscribed' : 'unsubscribed'))
      .catch(() => setState('unsubscribed'))
  }, [])

  async function subscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
      return
    }

    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: publicKey,
      })

      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh:   json.keys?.p256dh,
          auth:     json.keys?.auth,
        }),
      })

      setState('subscribed')
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err)
      setState(Notification.permission === 'denied' ? 'blocked' : 'unsubscribed')
    }
  }

  if (state === 'unsupported') return null
  if (state === 'blocked') {
    return (
      <span className="text-gray-400 text-xs" title="Notifications blocked — check browser settings">
        🔕 Notifications blocked
      </span>
    )
  }
  if (state === 'subscribed') {
    return (
      <span className="text-[#39ff14]/60 text-xs" title="You'll be notified when any team scores 13">
        🔔 Notified on 13s ✓
      </span>
    )
  }
  if (state === 'loading') {
    return (
      <span className="text-gray-400 text-xs animate-pulse">🔔 …</span>
    )
  }

  // unsubscribed — show opt-in button
  return (
    <button
      onClick={subscribe}
      className="text-[#39ff14]/70 hover:text-[#39ff14] transition-colors text-xs"
      title="Get a browser notification whenever any MLB team scores exactly 13 runs"
    >
      🔔 Get notified on 13s
    </button>
  )
}
