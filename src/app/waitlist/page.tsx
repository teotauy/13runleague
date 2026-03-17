'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function WaitlistPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono"
      >
        ← 13runleague.com
      </Link>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-[#39ff14] font-black text-6xl mb-6 leading-none">13</div>

        {done ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-black">You&apos;re in.</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              We&apos;ll send you the best 13-run moments of the season and let you know when spots open up for next year. Check your inbox for a confirmation.
            </p>
            <Link
              href="/teams"
              className="inline-block mt-4 bg-[#39ff14] text-black font-bold px-5 py-2.5 rounded-lg text-sm hover:brightness-110 transition-all"
            >
              Explore team stats →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black mb-2">Get your crew in next season.</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              The 13 Run League runs all MLB season. We&apos;ll send you the best 13-run moments each month and let you know when spots open up.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39ff14] transition-colors"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39ff14] transition-colors"
              />

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#39ff14] text-black font-black py-3 rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? 'Joining…' : "Count me in →"}
              </button>
            </form>

            <p className="text-gray-700 text-xs mt-4">
              No spam. Monthly highlights + one email when spots open.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
