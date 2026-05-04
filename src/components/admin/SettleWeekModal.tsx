'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SettlePreviewResponse } from '@/app/api/league/[slug]/settle-preview/route'
import type { Winner } from '@/lib/pot'

interface Props {
  week: number
  year: number
  leagueSlug: string
  onClose: () => void
  onSettled: () => void
}

type Phase = 'loading' | 'preview' | 'confirming' | 'success' | 'error'

/** How much buy-in to deduct for a winner — mirrors pot.ts logic, client-side for live preview. */
function buyInOwed(status: string | null | undefined, weekly_buy_in: number): number {
  if (status === 'paid') return 0
  if (status === '50%') return Math.round(weekly_buy_in / 2)
  return weekly_buy_in
}

function fmtDate(iso: string) {
  // "2026-04-28" → "Mon Apr 28"
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtRange(start: string, end: string) {
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

export default function SettleWeekModal({ week, year, leagueSlug, onClose, onSettled }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [preview, setPreview] = useState<SettlePreviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** Set of indices into preview.dbWinners that the commissioner has included. */
  const [included, setIncluded] = useState<Set<number>>(new Set())

  const fetchPreview = useCallback(async () => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch(
        `/api/league/${leagueSlug}/settle-preview?week_number=${week}&year=${year}`
      )
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? 'Failed to load preview')
      }
      const data = (await res.json()) as SettlePreviewResponse
      setPreview(data)
      // Default: all DB winners are included
      setIncluded(new Set(data.dbWinners.map((_, i) => i)))
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('error')
    }
  }, [leagueSlug, week, year])

  useEffect(() => { fetchPreview() }, [fetchPreview])

  // Derived payout math — re-runs when commissioner toggles winners
  const selectedWinners: Winner[] = preview
    ? preview.dbWinners.filter((_, i) => included.has(i))
    : []
  const totalShares = selectedWinners.length
  const pot = preview?.pot
  const payoutPerShare = pot && totalShares > 0 ? Math.floor(pot.total / totalShares) : 0
  const deductedMembers = new Set<string>()
  const payoutLines = selectedWinners.map((w) => {
    let deduction = 0
    if (!deductedMembers.has(w.member_id)) {
      deduction = buyInOwed(w.payment_status, pot?.weekly_buy_in ?? 0)
      if (deduction > 0) deductedMembers.add(w.member_id)
    }
    return { ...w, gross: payoutPerShare, deduction, net: Math.max(0, payoutPerShare - deduction) }
  })

  const handleToggle = (idx: number) => {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleConfirm = async () => {
    if (!preview) return
    setPhase('confirming')
    try {
      const overrideGames = selectedWinners.map((w) => ({
        winning_team: w.team,
        game_date: w.game_date,
      }))

      const res = await fetch(`/api/league/${leagueSlug}/calculate-payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_number: week, year, override_games: overrideGames }),
      })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        throw new Error(j.error ?? 'Settlement failed')
      }
      setPhase('success')
      onSettled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement failed')
      setPhase('error')
    }
  }

  const isRollover = totalShares === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#111] border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold">Settle Week {week}</h2>
            {preview && (
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                {fmtRange(preview.weekRange.start, preview.weekRange.end)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Loading */}
          {phase === 'loading' && (
            <div className="text-center py-16 text-gray-500 space-y-2">
              <div className="text-3xl animate-pulse">⚾</div>
              <p className="text-sm">Checking MLB Stats API for 13-run games…</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
                {error}
              </div>
              <button
                onClick={fetchPreview}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ↩ Try again
              </button>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="text-center py-12 space-y-3">
              <div className="text-5xl">✓</div>
              <p className="text-[#39ff14] font-bold text-xl">Week {week} settled</p>
              <p className="text-gray-400 text-sm">
                Pot locked · Droughts recalculated
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-8 py-2.5 bg-[#39ff14] text-black font-bold rounded-lg text-sm hover:bg-[#2fd400] transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Preview & Confirm */}
          {(phase === 'preview' || phase === 'confirming') && preview && (
            <>
              {/* Already-settled warning */}
              {preview.alreadySettled && (
                <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-800/60 text-yellow-300 text-xs">
                  ⚠️ Week {week} has already been settled. Confirming will overwrite the existing records.
                </div>
              )}

              {/* MLB Stats API — cross-reference */}
              <div>
                <div className="section-label mb-2">13-Run Games · MLB Stats API</div>
                {preview.mlbGames.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No 13-run Final games found via MLB Stats API for this week.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {preview.mlbGames.map((g, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-[#0a0a0a] rounded px-3 py-2 text-sm font-mono"
                      >
                        <span className="text-gray-600 text-xs w-20 shrink-0">{g.gameDate}</span>
                        <span className={g.winningAbbrs.includes(g.awayAbbr) ? 'text-[#39ff14] font-bold' : 'text-gray-300'}>
                          {g.awayAbbr} <span className="font-black">{g.awayScore}</span>
                        </span>
                        <span className="text-gray-700 text-xs">@</span>
                        <span className={g.winningAbbrs.includes(g.homeAbbr) ? 'text-[#39ff14] font-bold' : 'text-gray-300'}>
                          {g.homeAbbr} <span className="font-black">{g.homeScore}</span>
                        </span>
                        {g.winningAbbrs.map((a) => (
                          <span key={a} className="ml-auto text-[10px] bg-[#39ff14]/10 text-[#39ff14] px-1.5 py-0.5 rounded font-sans">
                            {a} wins
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* game_results DB winners — toggleable */}
              <div>
                <div className="section-label mb-1">Winners · From game_results DB</div>
                <p className="text-[11px] text-gray-600 mb-2">
                  Uncheck any game to exclude it. The pot math updates live.
                  {preview.dbWinners.length === 0 && ' Cron not yet run? Add results manually then re-preview.'}
                </p>

                {preview.dbWinners.length === 0 ? (
                  <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-400 text-sm">
                    No 13-run results in the database for this week.
                    {preview.mlbGames.length > 0 && (
                      <span className="text-amber-500"> The MLB API found games above — run the cron job or add results manually, then re-preview.</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {preview.dbWinners.map((w, i) => {
                      const isIncluded = included.has(i)
                      const line = payoutLines.find(
                        (p) => p.member_id === w.member_id && p.game_date === w.game_date
                      )
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer border transition-colors ${
                            isIncluded
                              ? 'bg-[#0a0a0a] border-gray-800'
                              : 'bg-[#0a0a0a]/50 border-gray-900 opacity-40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isIncluded}
                            onChange={() => handleToggle(i)}
                            className="accent-[#39ff14] shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm text-white">{w.member_name}</span>
                            <span className="text-gray-500 text-xs font-mono ml-2">{w.team}</span>
                          </div>
                          <span className="text-gray-600 text-xs font-mono shrink-0">{w.game_date}</span>
                          {w.payment_status !== 'paid' && (
                            <span className="text-yellow-400 text-xs font-mono shrink-0">
                              {w.payment_status === '50%' ? '½ paid' : 'unpaid'}
                              {' −$'}
                              {buyInOwed(w.payment_status, preview.pot.weekly_buy_in)}
                            </span>
                          )}
                          {isIncluded && line && (
                            <span className="text-[#39ff14] font-bold text-sm font-mono shrink-0 ml-1">
                              ${line.net}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Pot breakdown */}
              <div className="rounded-lg bg-[#0a0a0a] border border-gray-800 p-4 space-y-2">
                <div className="section-label mb-2">Pot Breakdown</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    This week ({preview.pot.member_count} × ${preview.pot.weekly_buy_in})
                  </span>
                  <span className="font-mono">${preview.pot.thisWeek.toLocaleString()}</span>
                </div>
                {preview.pot.rollover > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Rollover from Wk {week - 1}</span>
                    <span className="font-mono text-amber-400">${preview.pot.rollover.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-800 pt-2">
                  <span>Total</span>
                  <span className="font-mono text-[#39ff14]">${preview.pot.total.toLocaleString()}</span>
                </div>

                {totalShares > 0 ? (
                  <div className="flex justify-between text-sm text-gray-400 border-t border-gray-900 pt-2">
                    <span>{totalShares} share{totalShares !== 1 ? 's' : ''}</span>
                    <span className="font-mono">${payoutPerShare}/share</span>
                  </div>
                ) : (
                  <div className="text-sm text-amber-400 border-t border-gray-900 pt-2">
                    No winners selected — ${preview.pot.total.toLocaleString()} rolls to Week {week + 1}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={phase === 'confirming'}
                  className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={phase === 'confirming'}
                  className="flex-1 py-2.5 rounded-lg bg-[#39ff14] text-black font-bold text-sm hover:bg-[#2fd400] transition-colors disabled:opacity-50"
                >
                  {phase === 'confirming'
                    ? 'Settling…'
                    : isRollover
                      ? `✓ Confirm Rollover — Week ${week}`
                      : `✓ Settle Week ${week}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
