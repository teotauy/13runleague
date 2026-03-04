'use client'

import { useMemo } from 'react'

interface Member {
  id: string
  name: string
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
}

export default function PotBreakdown({
  members,
  payments,
  currentWeek,
  weeklyBuyIn,
  potTotal,
  weekWinners,
  settledPayouts,
}: Props) {
  const analysis = useMemo(() => {
    const paidThisWeek = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === 'paid'
    ).length

    const halfPaidThisWeek = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === '50%'
    ).length

    const totalMembers = members.length
    const weeklyPot = weeklyBuyIn * totalMembers
    // Pot is set at the start of the week (rollover + this week's buy-ins) and never
    // changes mid-week. Payouts are only settled on Sunday.
    const displayPot = potTotal + weeklyPot
    const paymentPercentage =
      totalMembers > 0 ? Math.round((paidThisWeek / totalMembers) * 100) : 0

    return {
      totalMembers,
      paidThisWeek,
      halfPaidThisWeek,
      displayPot,
      paymentPercentage,
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

        <div className="text-right shrink-0">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pot</div>
          <div className="text-4xl font-black font-mono text-[#39ff14]">
            ${analysis.displayPot}
          </div>
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
    </div>
  )
}
