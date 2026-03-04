'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import OverrideModal from './OverrideModal'
import Tooltip from '../Tooltip'

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
  override_note?: string | null
}

interface Props {
  members: Member[]
  payments: Payment[]
  leagueSlug: string
}

type PaymentStatus = 'unpaid' | '50%' | 'paid'

export default function PaymentBoard({ members, payments, leagueSlug }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [weeks, setWeeks] = useState<number[]>([1, 2, 3, 4, 5]) // Show last 5 weeks by default
  const [newWeek, setNewWeek] = useState(6)
  const [overrideModal, setOverrideModal] = useState<{
    memberId: string
    memberName: string
    weekNumber: number
  } | null>(null)

  // Get current week (simplified: assume week 1 is the first week of the year)
  const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1

  const getPayment = (memberId: string, week: number): Payment | undefined => {
    return payments.find((p) => p.member_id === memberId && p.week_number === week)
  }

  const getPaymentStatus = (memberId: string, week: number): PaymentStatus => {
    const payment = getPayment(memberId, week)
    return (payment?.payment_status as PaymentStatus) || 'unpaid'
  }

  const isOverridden = (memberId: string, week: number): boolean => {
    const payment = getPayment(memberId, week)
    return !!payment?.override_note
  }

  const getOverrideNote = (memberId: string, week: number): string | null => {
    const payment = getPayment(memberId, week)
    return payment?.override_note || null
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
                  const overridden = isOverridden(member.id, week)
                  const overrideNote = getOverrideNote(member.id, week)

                  return (
                    <td
                      key={`${member.id}-${week}`}
                      className={`text-center px-2 py-2 border-l border-gray-800 ${
                        overridden ? 'border-[#39ff14] border-l-4 bg-[#0a0a0a]' : ''
                      }`}
                    >
                      <div className="flex gap-1 justify-center items-center">
                        <Tooltip
                          label="Payment Status"
                          explanation={overrideNote ? `Override: ${overrideNote}` : 'Click to cycle through statuses'}
                        >
                          <button
                            onClick={() => handleCycleStatus(member.id, week)}
                            disabled={isLoading}
                            className={`px-2 py-1 rounded font-bold text-xs transition-colors ${getStatusColor(status)} hover:opacity-80 disabled:opacity-50 ${
                              overridden ? 'italic' : ''
                            }`}
                          >
                            {overridden ? '✓' : ''} {status}
                          </button>
                        </Tooltip>
                        <button
                          onClick={() =>
                            setOverrideModal({
                              memberId: member.id,
                              memberName: member.name,
                              weekNumber: week,
                            })
                          }
                          disabled={isLoading}
                          className="px-1.5 py-1 rounded text-xs bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50 font-semibold"
                          title="Add override note"
                        >
                          ⚙
                        </button>
                      </div>
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

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-400">
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
          <div className="w-8 h-6 bg-[#111] border-l-4 border-[#39ff14] rounded"></div>
          <span>Overridden</span>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModal && (
        <OverrideModal
          memberId={overrideModal.memberId}
          memberName={overrideModal.memberName}
          weekNumber={overrideModal.weekNumber}
          currentStatus={getPaymentStatus(overrideModal.memberId, overrideModal.weekNumber)}
          currentNote={getOverrideNote(overrideModal.memberId, overrideModal.weekNumber)}
          leagueSlug={leagueSlug}
          onClose={() => setOverrideModal(null)}
          onSuccess={() => {
            setOverrideModal(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
