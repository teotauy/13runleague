'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="bg-[#0a0a0a] min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-6xl font-black text-[#39ff14]">13</div>
          <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
          <p className="text-gray-400">We&apos;ve been notified and are looking into it.</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#39ff14] text-black font-bold rounded-lg hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
