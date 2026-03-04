'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  assigned_team: string
}

interface Payment {
  id: string
  member_id: string
  week_number: number
  payment_status: string
  override_note?: string
}

interface PayoutInfo {
  week_number: number
  calculated: boolean
  total_distributed?: number
  number_of_winners?: number
}

interface Props {
  members: Member[]
  payments: Payment[]
  leagueSlug: string
  payouts?: PayoutInfo[]
  year?: number
}

type PaymentStatus = 'unpaid' | '50%' | 'paid'

export default function PaymentBoard({ members, payments, leagueSlug, payouts = [], year = new Date().getFullYear() }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [calculatingWeek, setCalculatingWeek] = useState<number | null>(null)
  const [weeks, setWeeks] = useState<number[]>([1, 2, 3, 4, 5]) // Show last 5 weeks by default
  const [newWeek, setNewWeek] = useState(6)

  // Get current week (simplified: assume week 1 is the first week of the year)
  const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

  const getPaymentStatus = (memberId: string, week: number): PaymentStatus => {
    const payment = payments.find((p) => p.member_id === memberId && p.week_number === week)
    return (payment?.payment_status as PaymentStatus) || 'unpaid'
  }

  const getPayoutStatus = (week: number): PayoutInfo | undefined => {
    return payouts.find((p) => p.week_number === week)
  }

  const handleCalculatePayouts = async (week: number) => {
    setCalculatingWeek(week)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/calculate-payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_number: week,
          year,
        }),
      })

      if (!res.ok) throw new Error('Failed to calculate payouts')

      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error calculating payouts')
    } finally {
      setCalculatingWeek(null)
    }
  }

  const handleCycleStatus = async (memberId: string, week: number) => {
    const current = getPaymentStatus(memberId, week)
    const next: PaymentStatus = current === 'unpaid' ? '50%' : current === '50%' ? 'paid' : 'unpaid'

    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          week_number: week,
          payment_status: next,
        }),
      })

      if (!res.ok) throw new Error('Failed to update payment')

      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error updating payment')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-900 text-green-200'
      case '50%':
        return 'bg-yellow-900 text-yellow-200'
      default:
        return 'bg-red-900 text-red-200'
    }
  }

  const handleAddWeek = () => {
    setWeeks([...weeks, newWeek])
    setNewWeek(newWeek + 1)
  }

  return (
    <div className="space-y-4">
      {/* Add Week Button */}
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          max="52"
          value={newWeek}
          onChange={(e) => setNewWeek(parseInt(e.target.value) || 1)}
          className="w-16 bg-[#0a0a0a] border border-gray-700 rounded px-2 py-1 text-white"
        />
        <button
          onClick={handleAddWeek}
          className="px-3 py-1 bg-[#39ff14] text-black font-bold rounded text-sm hover:bg-[#2fd400]"
        >
          + Week
        </button>
      </div>

      {/* Payment Grid */}
      <div className="overflow-x-auto rounded-lg border border-gray-800 bg-[#111]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0a0a0a]">
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Member</th>
              {weeks.map((week) => (
                <th
                  key={week}
                  className="text-center px-3 py-3 text-gray-400 font-semibold border-l border-gray-800"
                >
                  W{week}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                <td className="px-4 py-3 text-white font-semibold">{member.name}</td>
                {weeks.map((week) => {
                  const status = getPaymentStatus(member.id, week)
                  return (
                    <td
                      key={`${member.id}-${week}`}
                      className="text-center px-3 py-3 border-l border-gray-800"
                    >
                      <button
                        onClick={() => handleCycleStatus(member.id, week)}
                        disabled={isLoading}
                        className={`w-12 py-1 rounded font-bold text-xs transition-colors ${getStatusColor(status)} hover:opacity-80 disabled:opacity-50`}
                      >
                        {status}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">No members to track</div>
        )}
      </div>

      {/* Payout Calculation Controls */}
      <div className="mt-6 p-4 rounded-lg border border-gray-800 bg-[#0a0a0a]">
        <h3 className="text-sm font-semibold text-white mb-3">Payout Calculation</h3>
        <p className="text-xs text-gray-400 mb-4">Calculate and distribute payouts for specific weeks</p>
        <div className="flex gap-2 flex-wrap">
          {weeks.map((week) => {
            const payoutStatus = getPayoutStatus(week)
            return (
              <button
                key={week}
                onClick={() => handleCalculatePayouts(week)}
                disabled={isLoading || calculatingWeek === week}
                className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
                  payoutStatus?.calculated
                    ? 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {calculatingWeek === week ? '⏳ W' : payoutStatus?.calculated ? '✓ W' : 'W'}{week}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-red-900 rounded"></div>
          <span>Unpaid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-yellow-900 rounded"></div>
          <span>50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-green-900 rounded"></div>
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-6 bg-blue-900 rounded"></div>
          <span>Payouts Calculated</span>
        </div>
      </div>
    </div>
  )
}
