'use client'

import { useState } from 'react'

export default function RecalculateStreaksButton({
  leagueSlug,
  year,
}: {
  leagueSlug: string
  year: number
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleRecalculate() {
    setStatus('loading')
    setMessage(null)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/recalculate-streaks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Unknown error')
      } else {
        setStatus('ok')
        setMessage(data.message ?? 'Streaks updated')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleRecalculate}
        disabled={status === 'loading'}
        className="px-4 py-2 rounded bg-gray-800 border border-gray-700 text-sm font-mono text-gray-300
          hover:border-gray-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? '⏳ Recalculating…' : '🔁 Recalculate Streaks'}
      </button>

      {status === 'ok' && (
        <span className="text-xs text-[#39ff14] font-mono">✓ {message}</span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-400 font-mono">✗ {message}</span>
      )}
    </div>
  )
}
