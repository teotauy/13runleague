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

interface Payout {
  member_name: string
  payout_amount: number
  week_number: number
  winning_team: string
}

interface Props {
  members: Member[]
  payments: Payment[]
  currentWeek: number
  weeklyBuyIn: number
  payouts: Payout[]
  potTotal: number
}

export default function PotBreakdown({
  members,
  payments,
  currentWeek,
  weeklyBuyIn,
  payouts,
  potTotal,
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
    const totalPot = potTotal + weeklyPot
    const paymentPercentage =
      totalMembers > 0 ? Math.round((paidThisWeek / totalMembers) * 100) : 0

    const weekPayouts = payouts.filter((p) => p.week_number === currentWeek)

    return {
      totalMembers,
      paidThisWeek,
      halfPaidThisWeek,
      weeklyPot,
      totalPot,
      paymentPercentage,
      weekPayouts,
    }
  }, [members, payments, currentWeek, weeklyBuyIn, payouts, potTotal])

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111] p-6 space-y-6">
      {/* Winners + Pot */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Winners this week
          </div>
          {analysis.weekPayouts.length > 0 ? (
            <div className="space-y-2">
              {analysis.weekPayouts.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-[#39ff14] font-bold text-lg leading-tight">
                    {p.member_name}
                  </span>
                  <span className="text-gray-500 text-sm">({p.winning_team})</span>
                  <span className="text-gray-400 text-sm font-mono">${p.payout_amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-lg font-semibold">None</div>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pot</div>
          <div className="text-4xl font-black font-mono text-[#39ff14]">
            ${analysis.totalPot}
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
