'use client'

import { useState } from 'react'

interface Props {
  leagueSlug: string
  hasMemberPassword: boolean
}

export default function MemberPasswordForm({ leagueSlug, hasMemberPassword }: Props) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setStatus('saving')
    setError(null)

    try {
      const res = await fetch(`/api/league/${leagueSlug}/set-member-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }

      setStatus('saved')
      setPassword('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">Member Password</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Shared view-only access for all 30 players
          </p>
        </div>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            hasMemberPassword
              ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          {hasMemberPassword ? 'set' : 'not set'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={hasMemberPassword ? 'Enter new password to change…' : 'e.g. southbrooklyn26'}
          className="flex-1 px-3 py-2 rounded bg-[#0a0a0a] border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#39ff14] transition-colors font-mono"
          minLength={3}
        />
        <button
          type="submit"
          disabled={status === 'saving' || !password.trim()}
          className="px-4 py-2 rounded bg-[#39ff14] text-black text-sm font-bold hover:bg-[#2de010] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save'}
        </button>
      </form>

      {status === 'error' && error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
      {status === 'saved' && (
        <p className="text-xs text-[#39ff14] mt-2">Member password updated. Share it with your players.</p>
      )}
    </div>
  )
}
