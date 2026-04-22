'use client'

import { useState, useEffect } from 'react'

const FAILED_IDS_KEY = 'sendReceipts_failedIds'

interface Member {
  id: string
  name: string
}

interface Props {
  leagueSlug: string
  memberCount: number
  members: Member[]
}

export default function SendReceiptModal({ leagueSlug, memberCount, members }: Props) {
  const [open, setOpen] = useState(false)
  const [leaguePassword, setLeaguePassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [storedFailedIds, setStoredFailedIds] = useState<string[]>([])
  // null = send all; Set<string> = only selected IDs
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)

  // Load any persisted failed IDs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAILED_IDS_KEY)
      if (stored) setStoredFailedIds(JSON.parse(stored))
    } catch {}
  }, [])

  function handleOpen() {
    setOpen(true)
    setStatus('idle')
    setResult(null)
    setIsRetrying(false)
    setSelectedIds(null)
  }
  function handleClose() {
    setOpen(false)
    setStatus('idle')
    setResult(null)
    setIsRetrying(false)
    setSelectedIds(null)
  }

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const base = prev ?? new Set(members.map((m) => m.id))
      const next = new Set(base)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() { setSelectedIds(null) }
  function selectNone() { setSelectedIds(new Set()) }

  async function send(sendTo?: string[]) {
    setStatus('loading')
    setResult(null)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/send-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaguePassword: leaguePassword.trim() || undefined,
          sendTo,
        }),
      })
      const data = await res.json()
      setStatus(res.ok ? 'success' : 'error')
      setResult(data)

      if (data.errors?.length > 0) {
        const failedNames = data.errors.map((e: string) => e.split(':')[0].trim())
        const failedIds = members.filter((m) => failedNames.includes(m.name)).map((m) => m.id)
        localStorage.setItem(FAILED_IDS_KEY, JSON.stringify(failedIds))
        setStoredFailedIds(failedIds)
      } else {
        localStorage.removeItem(FAILED_IDS_KEY)
        setStoredFailedIds([])
      }
    } catch (err) {
      setStatus('error')
      setResult({ sent: 0, failed: memberCount, errors: [err instanceof Error ? err.message : 'Network error'] })
    }
  }

  function handleSend() {
    const ids = selectedIds ? Array.from(selectedIds) : undefined
    send(ids)
  }

  function handleRetry(ids: string[]) {
    setIsRetrying(true)
    send(ids)
  }

  const effectiveSelected = selectedIds ?? new Set(members.map((m) => m.id))
  const sendCount = effectiveSelected.size
  const showPicker = status === 'idle' || status === 'error'

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
          <div className="bg-[#0f1115] border border-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">

            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Send Season Emails</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Personalized email — team, blurbs, and league info.
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-white text-xl leading-none ml-4">×</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide">
                League Password{' '}
                <span className="text-gray-400 normal-case font-normal">(optional)</span>
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

            {/* Stored failed banner */}
            {storedFailedIds.length > 0 && status === 'idle' && (
              <div className="p-3 rounded bg-yellow-900/20 border border-yellow-700/50">
                <p className="text-yellow-400 text-xs font-bold mb-2">
                  ⚠ {storedFailedIds.length} failed from last send — retry those only?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRetry(storedFailedIds)}
                    className="flex-1 px-3 py-1.5 rounded bg-yellow-600 text-white text-xs font-bold hover:bg-yellow-500 transition-colors"
                  >
                    ↺ Retry {storedFailedIds.length} Failed
                  </button>
                  <button
                    onClick={() => { localStorage.removeItem(FAILED_IDS_KEY); setStoredFailedIds([]) }}
                    className="px-3 py-1.5 rounded bg-gray-800 text-gray-400 text-xs hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Member picker */}
            {showPicker && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Recipients{' '}
                    <span className="text-[#39ff14] font-bold">{sendCount}</span>
                    <span className="text-gray-400"> / {members.length}</span>
                  </span>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-gray-500 hover:text-[#39ff14] transition-colors">All</button>
                    <span className="text-gray-400">·</span>
                    <button onClick={selectNone} className="text-xs text-gray-500 hover:text-red-400 transition-colors">None</button>
                  </div>
                </div>
                <div className="rounded bg-[#161a1f] border border-gray-800 divide-y divide-gray-800 max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const checked = effectiveSelected.has(m.id)
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(m.id)}
                          className="accent-[#39ff14] w-3.5 h-3.5 shrink-0"
                        />
                        <span className={`text-sm ${checked ? 'text-white' : 'text-gray-400 line-through'}`}>
                          {m.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Result */}
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

            <div className="flex gap-3 flex-wrap">
              {!isRetrying && status !== 'success' && (
                <button
                  onClick={handleSend}
                  disabled={status === 'loading' || sendCount === 0}
                  className="flex-1 px-4 py-2.5 rounded bg-[#39ff14] text-black text-sm font-bold
                    hover:bg-[#2de010] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {status === 'loading'
                    ? '⏳ Sending…'
                    : `Send to ${sendCount === members.length ? `All (${sendCount})` : `${sendCount} Selected`}`}
                </button>
              )}
              {status === 'success' && result && result.failed > 0 && (
                <button
                  onClick={() => handleRetry(
                    members
                      .filter((m) => result.errors.map((e) => e.split(':')[0].trim()).includes(m.name))
                      .map((m) => m.id)
                  )}
                  className="flex-1 px-4 py-2.5 rounded bg-yellow-600 text-white text-sm font-bold
                    hover:bg-yellow-500 transition-colors"
                >
                  ↺ Retry {result.failed} Failed
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
