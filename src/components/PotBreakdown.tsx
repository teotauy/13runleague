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
}

export default function PotBreakdown({
  members,
  payments,
  currentWeek,
  weeklyBuyIn,
  payouts,
}: Props) {
  const analysis = useMemo(() => {
    // Count paid members this week
    const paidThisWeek = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === 'paid'
    ).length

    const halfPaidThisWeek = payments.filter(
      (p) => p.week_number === currentWeek && p.payment_status === '50%'
    ).length

    const totalMembers = members.length
    const currentPotBase = weeklyBuyIn * totalMembers
    const paymentPercentage = Math.round((paidThisWeek / totalMembers) * 100)

    // Get recent payouts for this week
    const weekPayouts = payouts.filter((p) => p.week_number === currentWeek)
    const totalDistributed = weekPayouts.reduce((sum, p) => sum + p.payout_amount, 0)

    return {
      totalMembers,
      paidThisWeek,
      halfPaidThisWeek,
      currentPotBase,
      paymentPercentage,
      weekPayouts,
      totalDistributed,
      payout_if_one_winner: currentPotBase,
      payout_if_two_winners: Math.floor(currentPotBase / 2),
      payout_if_three_winners: Math.floor(currentPotBase / 3),
    }
  }, [members, payments, currentWeek, weeklyBuyIn, payouts])

  return (
    <div className="space-y-6">
      {/* Current Pot Status */}
      <div className="rounded-lg border border-gray-800 bg-[#111] p-6">
        <h2 className="text-lg font-bold text-white mb-4">Week {currentWeek} Pot Tracker</h2>

        {/* Pot Amount Display */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-[#39ff14]">${analysis.currentPotBase}</div>
            <div className="text-sm text-gray-400 mt-1">
              ${analysis.weeklyBuyIn} × {analysis.totalMembers} members
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

        {/* Payout Simulation */}
        <div className="space-y-3 pt-4 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300">If game ends 13-run:</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0a0a0a] rounded p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">1 winner</div>
              <div className="text-lg font-bold text-[#39ff14]">${analysis.payout_if_one_winner}</div>
            </div>
            <div className="bg-[#0a0a0a] rounded p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">2 winners</div>
              <div className="text-lg font-bold text-[#39ff14]">${analysis.payout_if_two_winners}</div>
            </div>
            <div className="bg-[#0a0a0a] rounded p-3 text-center">
              <div className="text-xs text-gray-400 mb-1">3+ winners</div>
              <div className="text-lg font-bold text-[#39ff14]">${analysis.payout_if_three_winners}+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payouts History */}
      {analysis.weekPayouts.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-[#111] p-6">
          <h3 className="text-lg font-bold text-white mb-4">Week {currentWeek} Payouts</h3>
          <div className="space-y-2">
            {analysis.weekPayouts.map((payout, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white font-semibold">{payout.member_name}</span>
                  <span className="text-gray-500 ml-2">({payout.winning_team})</span>
                </div>
                <span className="text-[#39ff14] font-bold">${payout.payout_amount}</span>
              </div>
            ))}
            <div className="border-t border-gray-800 pt-2 mt-2 flex justify-between text-sm font-bold">
              <span className="text-gray-300">Total Distributed</span>
              <span className="text-[#39ff14]">${analysis.totalDistributed}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
