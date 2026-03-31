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
  const [weeks, setWeeks] = useState<number[]>([1, 2, 3, 4, 5])
  const [newWeek, setNewWeek] = useState(6)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [markingAllFor, setMarkingAllFor] = useState<string | null>(null)

  const getPaymentStatus = (memberId: string, week: number): PaymentStatus => {
    const payment = payments.find((p) => p.member_id === memberId && p.week_number === week)
    return (payment?.payment_status as PaymentStatus) || 'unpaid'
  }

  const getPayoutStatus = (week: number): PayoutInfo | undefined => {
    return payouts.find((p) => p.week_number === week)
  }

  // Summary stats for collapsed header
  const totalCells = members.length * weeks.length
  const paidCells = members.reduce((acc, m) =>
    acc + weeks.filter((w) => getPaymentStatus(m.id, w) === 'paid').length, 0)
  const unpaidMembers = members.filter((m) =>
    weeks.some((w) => getPaymentStatus(m.id, w) !== 'paid')
  )

  const handleCalculatePayouts = async (week: number) => {
    setCalculatingWeek(week)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/calculate-payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_number: week, year }),
      })
      if (!res.ok) {
        let msg = 'Failed to calculate payouts'
        try {
          const j = (await res.json()) as { error?: string }
          if (j?.error) msg = j.error
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Error calculating payouts')
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
        body: JSON.stringify({ member_id: memberId, week_number: week, payment_status: next }),
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

  const handleMarkAllPaid = async (memberId: string) => {
    setMarkingAllFor(memberId)
    try {
      await Promise.all(
        weeks.map((week) =>
          fetch(`/api/league/${leagueSlug}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: memberId, week_number: week, payment_status: 'paid' }),
          })
        )
      )
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error marking all weeks paid')
    } finally {
      setMarkingAllFor(null)
    }
  }

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':   return 'bg-green-900 text-green-200'
      case '50%':    return 'bg-yellow-900 text-yellow-200'
      default:       return 'bg-red-900 text-red-200'
    }
  }

  const handleAddWeek = () => {
    setWeeks([...weeks, newWeek])
    setNewWeek(newWeek + 1)
  }

  return (
    <div className="space-y-4">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
          >
            <span className="text-gray-600">{isCollapsed ? '▶' : '▼'}</span>
            Payment Status
          </button>
          {/* Summary pill — always visible */}
          <span className={`px-2 py-0.5 rounded text-xs font-mono ${
            unpaidMembers.length === 0
              ? 'bg-green-900 text-green-200'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {paidCells}/{totalCells} paid
            {unpaidMembers.length > 0 && ` · ${unpaidMembers.length} member${unpaidMembers.length > 1 ? 's' : ''} behind`}
          </span>
        </div>

        {!isCollapsed && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="1"
              max="52"
              value={newWeek}
              onChange={(e) => setNewWeek(parseInt(e.target.value) || 1)}
              className="w-16 bg-[#0a0a0a] border border-gray-700 rounded px-2 py-1 text-white text-xs"
            />
            <button
              onClick={handleAddWeek}
              className="px-3 py-1 bg-[#39ff14] text-black font-bold rounded text-xs hover:bg-[#2fd400]"
            >
              + Week
            </button>
          </div>
        )}
      </div>

      {/* Collapsible body */}
      {!isCollapsed && (
        <>
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
                  <th className="text-center px-3 py-3 text-gray-500 font-semibold border-l border-gray-800">
                    All
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const allPaid = weeks.every((w) => getPaymentStatus(member.id, w) === 'paid')
                  const isMarkingThis = markingAllFor === member.id
                  return (
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
                              disabled={isLoading || isMarkingThis}
                              className={`w-12 py-1 rounded font-bold text-xs transition-colors ${getStatusColor(status)} hover:opacity-80 disabled:opacity-50`}
                            >
                              {status}
                            </button>
                          </td>
                        )
                      })}
                      {/* Mark all weeks paid */}
                      <td className="text-center px-3 py-3 border-l border-gray-800">
                        {allPaid ? (
                          <span className="text-green-600 text-xs font-mono">✓</span>
                        ) : (
                          <button
                            onClick={() => handleMarkAllPaid(member.id)}
                            disabled={isLoading || isMarkingThis}
                            title="Mark all displayed weeks as paid"
                            className="px-2 py-1 rounded text-xs font-bold bg-green-900 text-green-200 hover:bg-green-800 disabled:opacity-50"
                          >
                            {isMarkingThis ? '…' : '✓ All'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {members.length === 0 && (
              <div className="text-center py-8 text-gray-500">No members to track</div>
            )}
          </div>

          {/* Settle week — hits calculate-payouts API */}
          <div className="mt-2 p-4 rounded-lg border border-[#39ff14]/30 bg-[#0a0a0a]">
            <h3 className="text-sm font-semibold text-[#39ff14] mb-1">Settle week</h3>
            <p className="text-xs text-gray-500 mb-3">
              Locks the pot for that week: ledger entry, winner payouts (from 13-run games), rollover if nobody won,
              and drought refresh. Safe to run again for the same week only if you need to repair data.
            </p>
            <div className="flex gap-2 flex-wrap">
              {weeks.map((week) => {
                const payoutStatus = getPayoutStatus(week)
                return (
                  <button
                    key={week}
                    type="button"
                    title={`Settle week ${week} for season ${year}`}
                    onClick={() => handleCalculatePayouts(week)}
                    disabled={isLoading || calculatingWeek === week}
                    className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
                      payoutStatus?.calculated
                        ? 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                        : 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40 hover:bg-[#39ff14]/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {calculatingWeek === week
                      ? `Settling… ${week}`
                      : payoutStatus?.calculated
                        ? `Again ${week} ✓`
                        : `Settle week ${week}`}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-4 bg-red-900 rounded"></div>
              <span>Unpaid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-4 bg-yellow-900 rounded"></div>
              <span>50%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-4 bg-green-900 rounded"></div>
              <span>Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-4 bg-blue-900 rounded"></div>
              <span>Payouts Calculated</span>
            </div>
            <span className="text-gray-600 ml-2">· Click any cell to cycle status · ✓ All marks every displayed week as paid</span>
          </div>
        </>
      )}
    </div>
  )
}
