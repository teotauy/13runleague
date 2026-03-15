'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js once on mount.
 * Rendered in the root layout so it runs on every page.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[SW] Registration failed:', err))
    }
  }, [])

  return null
}
