'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function UnsubscribePage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      setStatus('done')
    } else {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Something went wrong. Try again.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6 font-mono">

        <div>
          <div className="text-[#39ff14] text-2xl font-black mb-1">13 Run League</div>
          <div className="text-gray-500 text-sm">Email preferences</div>
        </div>

        {status === 'done' ? (
          <div className="space-y-4">
            <div className="text-white text-lg font-bold">You&apos;re unsubscribed.</div>
            <p className="text-gray-500 text-sm">
              {email} won&apos;t receive future recap emails.
            </p>
            <Link href="/" className="text-[#39ff14] text-sm hover:underline inline-block mt-2">
              ← Back to dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Enter your email to stop receiving weekly recap emails.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            {status === 'error' && (
              <p className="text-red-400 text-xs">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-white rounded-lg px-4 py-3 text-sm transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? 'Unsubscribing…' : 'Unsubscribe'}
            </button>
            <Link href="/" className="text-gray-400 text-xs hover:text-gray-400 inline-block">
              ← Back to dashboard
            </Link>
          </form>
        )}

      </div>
    </main>
  )
}
