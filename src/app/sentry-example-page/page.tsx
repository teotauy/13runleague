'use client'

import * as Sentry from '@sentry/nextjs'

export default function SentryExamplePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Sentry Test</h1>
        <p className="text-gray-400">Click the button to send a test error to Sentry.</p>
        <button
          className="px-6 py-3 bg-[#39ff14] text-black font-bold rounded-lg hover:opacity-90"
          onClick={() => {
            Sentry.captureException(new Error('Test error from 13runleague — Sentry is working!'))
            alert('Test error sent! Check your Sentry dashboard.')
          }}
        >
          Send Test Error
        </button>
      </div>
    </main>
  )
}
