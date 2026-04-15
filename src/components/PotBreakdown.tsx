'use client'

import { useMemo } from 'react'

/**
 * Headline pot size: scales up from ~half a weekly pool toward a ceiling at $1200;
 * above $1200 size stays max and the wrapper gets a wobble (see globals.css).
 */
function getPotDisplayMetrics(amount: number, weeklyPot: number): {
  fontSizeRem: number
  isJackpot: boolean
} {
  const n = Math.max(0, amount)
  const floor = Math.max(weeklyPot * 0.5, 150)
  const cap = 1200
  const baseRem = 2.25
  const maxRem = 3.2

  if (n > cap) {
    return { fontSizeRem: maxRem, isJackpot: true }
  }

  if (n <= floor) {
    const t = floor > 0 ? n / floor : 1
    return { fontSizeRem: 1.9 + (baseRem - 1.9) * Math.min(1, t), isJackpot: false }
  }

  const t = (n - floor) / (cap - floor)
  const rem = baseRem + (maxRem - baseRem) * Math.min(1, Math.max(0, t))
  return { fontSizeRem: rem, isJackpot: false }
}

interface Member {
  id: string
  name: string
  pre_season_paid?: boolean | null
}

interface Payment {
  member_id: string
  week_number: number
  payment_status: string
}

interface WeekWinner {
  member_id: string
  member_name: string
  team: string
  game_date: string
}

interface SettledPayout {
  member_id: string
  payout_amount: number
}

interface Props {
  members: Member[]
  payments: Payment[]
  currentWeek: number
  weeklyBuyIn: number
  potTotal: number
  // Winners derived from game_results — populated as soon as a team scores 13 this week
  weekWinners: WeekWinner[]
  // Payout amounts once the admin settles at end of week (optional)
  settledPayouts: SettledPayout[]
  /** P(at least one 13-run game in remaining league games this week), 0–1 */
  sweatPct?: number
  /** Total non-Final team-game slots remaining this week */
  totalGamesLeft?: number
}

function sweatLabel(pct: number): { emoji: string; label: string; color: string } {
  if (pct >= 0.50) return { emoji: '💀', label: 'Pray',        color: '#ef4444' }
  if (pct >= 0.30) return { emoji: '🔥', label: 'Dangerous',   color: '#f97316' }
  if (pct >= 0.15) return { emoji: '😰', label: 'Warming Up',  color: '#eab308' }
  if (pct >= 0.05) return { emoji: '😐', label: 'Low Risk',    color: '#6b7280' }
  return              { emoji: '🥶', label: 'Ice Cold',    color: '#3b82f6' }
}

export default function PotBreakdown({
  members,
  payments,
  currentWeek,
  weeklyBuyIn,
  potTotal,
  weekWinners,
  settledPayouts,
  sweatPct,
  totalGamesLeft,
}: Props) {
  const analysis = useMemo(() => {
    const weeklyPaid = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === 'paid'
    ).length

    const halfPaidThisWeek = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === '50%'
    ).length

    // Before the season starts, fall back to pre-season paid status
    const preSeasonPaid = members.filter((m) => m.pre_season_paid).length
    const paidThisWeek = weeklyPaid > 0 ? weeklyPaid : preSeasonPaid
    const isPreSeason = weeklyPaid === 0 && preSeasonPaid > 0

    const totalMembers = members.length
    const weeklyPot = weeklyBuyIn * totalMembers
    const displayPot = potTotal + weeklyPot
    const paymentPercentage =
      totalMembers > 0 ? Math.round((paidThisWeek / totalMembers) * 100) : 0

    const potMetrics = getPotDisplayMetrics(displayPot, weeklyPot)

    return {
      totalMembers,
      paidThisWeek,
      halfPaidThisWeek,
      displayPot,
      paymentPercentage,
      isPreSeason,
      potMetrics,
    }
  }, [members, payments, currentWeek, weeklyBuyIn, potTotal])

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111] p-6 space-y-6">
      {/* Winners + Pot */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Winners this week
          </div>
          {weekWinners.length > 0 ? (
            <div className="space-y-2">
              {weekWinners.map((w) => {
                const payout = settledPayouts.find((p) => p.member_id === w.member_id)
                return (
                  <div key={w.member_id} className="flex items-center gap-3">
                    <span className="text-[#39ff14] font-bold text-lg leading-tight">
                      {w.member_name}
                    </span>
                    <span className="text-gray-500 text-sm">({w.team})</span>
                    {payout && (
                      <span className="text-gray-400 text-sm font-mono">
                        ${payout.payout_amount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-lg font-semibold">None</div>
          )}
        </div>

        <div className="text-right shrink-0 min-h-[3.5rem] flex flex-col items-end justify-start">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pot</div>
          <span className={analysis.potMetrics.isJackpot ? 'pot-jackpot-bounce' : ''}>
            <span
              className="font-black font-mono text-[#39ff14] leading-none tracking-tight transition-[font-size] duration-500 ease-out tabular-nums"
              style={{ fontSize: `${analysis.potMetrics.fontSizeRem.toFixed(2)}rem` }}
            >
              ${analysis.displayPot.toLocaleString()}
            </span>
          </span>
          <div className="text-xs text-gray-600 mt-1">Week {currentWeek}</div>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Payment Status</span>
          <span>
            {analysis.paidThisWeek} / {analysis.totalMembers} paid
          </span>
        </div>
        <div className="w-full h-2 rounded bg-gray-900 overflow-hidden">
          <div
            className="h-full bg-[#39ff14] transition-all duration-300"
            style={{ width: `${analysis.paymentPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <div>
            <span className="text-green-400 font-semibold">{analysis.paidThisWeek}</span> paid
          </div>
          <div>
            <span className="text-yellow-400 font-semibold">{analysis.halfPaidThisWeek}</span>{' '}
            50%
          </div>
          <div>
            <span className="text-red-400 font-semibold">
              {analysis.totalMembers - analysis.paidThisWeek - analysis.halfPaidThisWeek}
            </span>{' '}
            unpaid
          </div>
        </div>
      </div>

      {/* Sweat Meter */}
      {sweatPct !== undefined && (
        <div className="space-y-1.5 pt-2 border-t border-gray-800">
          {(() => {
            const { emoji, label, color } = sweatLabel(sweatPct)
            const barPct = Math.round(sweatPct * 100)
            return (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 uppercase tracking-wider">Sweat Factor</span>
                  <span className="font-mono font-bold" style={{ color }}>
                    {emoji} {label}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded bg-gray-900 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${barPct}%`, backgroundColor: color }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-700">
                  <span>
                    {barPct}%{' '}
                    {weekWinners.length > 0 ? 'chance of a split' : 'chance of a 13 this week'}
                  </span>
                  {totalGamesLeft !== undefined && (
                    <span>{totalGamesLeft} game{totalGamesLeft !== 1 ? 's' : ''} left</span>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
