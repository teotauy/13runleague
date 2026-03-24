'use client'

import { useState } from 'react'

interface Props {
  leagueSlug: string
  memberCount: number
}

export default function SendReceiptModal({ leagueSlug, memberCount }: Props) {
  const [open, setOpen] = useState(false)
  const [leaguePassword, setLeaguePassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null)

  function handleOpen() { setOpen(true); setStatus('idle'); setResult(null) }
  function handleClose() { setOpen(false); setStatus('idle'); setResult(null) }

  async function handleSend() {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/send-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaguePassword: leaguePassword.trim() || undefined }),
      })
      const data = await res.json()
      setStatus(res.ok ? 'success' : 'error')
      setResult(data)
    } catch (err) {
      setStatus('error')
      setResult({ sent: 0, failed: memberCount, errors: [err instanceof Error ? err.message : 'Network error'] })
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="px-4 py-2 bg-[#39ff14] text-black text-sm font-bold rounded-lg hover:bg-[#2de010] transition-colors"
      >
        ✉ Send Season Emails
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="bg-[#0f1115] border border-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5">

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Send Season Emails</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Personalized email to{' '}
                  <span className="text-[#39ff14] font-bold">{memberCount}</span>{' '}
                  active members — their team, team blurbs, and league info.
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-600 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                League Password{' '}
                <span className="text-gray-600 normal-case font-normal">(optional — included in email if provided)</span>
              </label>
              <input
                type="text"
                value={leaguePassword}
                onChange={(e) => setLeaguePassword(e.target.value)}
                placeholder="Leave blank to omit from email"
                disabled={status === 'loading'}
                className="w-full px-3 py-2 rounded bg-[#161a1f] border border-gray-700 text-white text-sm
                  placeholder-gray-600 focus:outline-none focus:border-[#39ff14] transition-colors disabled:opacity-50"
              />
            </div>

            {status === 'success' && result && (
              <div className="p-3 rounded bg-[#39ff14]/10 border border-[#39ff14]/30">
                <p className="text-[#39ff14] text-sm font-bold">
                  ✓ Sent to {result.sent} member{result.sent !== 1 ? 's' : ''}
                  {result.failed > 0 && <span className="text-yellow-400 ml-2">({result.failed} failed)</span>}
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {result.errors.map((e, i) => <li key={i} className="text-xs text-red-400 font-mono">{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            {status === 'error' && result && (
              <div className="p-3 rounded bg-red-900/20 border border-red-800/50">
                {result.errors.map((e, i) => <p key={i} className="text-red-400 text-sm font-mono">{e}</p>)}
              </div>
            )}

            <div className="flex gap-3">
              {status !== 'success' && (
                <button
                  onClick={handleSend}
                  disabled={status === 'loading'}
                  className="flex-1 px-4 py-2.5 rounded bg-[#39ff14] text-black text-sm font-bold
                    hover:bg-[#2de010] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? '⏳ Sending…' : `Send to All (${memberCount})`}
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-400
                  hover:text-white hover:border-gray-500 transition-colors"
              >
                {status === 'success' ? 'Done' : 'Cancel'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
