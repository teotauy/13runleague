'use client'

import { useState, useTransition } from 'react'

type Returning = 'yes' | 'no' | 'maybe' | null

interface Member {
  id: string
  name: string
  assigned_team: string
  pre_season_returning: Returning
  pre_season_paid: boolean
}

interface Props {
  leagueSlug: string
  members: Member[]
}

export default function PreSeasonStatus({ leagueSlug, members: initialMembers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [isPending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)

  const confirmed = members.filter((m) => m.pre_season_returning === 'yes').length
  const maybe = members.filter((m) => m.pre_season_returning === 'maybe').length
  const no = members.filter((m) => m.pre_season_returning === 'no').length
  const unset = members.filter((m) => !m.pre_season_returning).length
  const vacancies = no + unset
  const paid = members.filter((m) => m.pre_season_returning === 'yes' && m.pre_season_paid).length

  async function updateMember(memberId: string, field: 'returning' | 'paid', value: unknown) {
    setSavingId(memberId)

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m
        if (field === 'returning') {
          const newReturning = value as Returning
          return {
            ...m,
            pre_season_returning: newReturning,
            // Clear paid if switching away from yes
            pre_season_paid: newReturning === 'yes' ? m.pre_season_paid : false,
          }
        }
        return { ...m, pre_season_paid: value as boolean }
      })
    )

    startTransition(async () => {
      try {
        const body: Record<string, unknown> = { memberId }
        if (field === 'returning') body.returning = value
        if (field === 'paid') body.paid = value

        await fetch(`/api/league/${leagueSlug}/preseason`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        // Server error — revert optimistic update by re-fetching would be ideal,
        // but for simplicity we just leave the optimistic state (user can reload)
      } finally {
        setSavingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryTile label="Confirmed In" value={confirmed} color="text-[#39ff14]" />
        <SummaryTile label="Maybe" value={maybe} color="text-amber-400" />
        <SummaryTile label="Out / Unknown" value={vacancies} color="text-red-400" />
        <SummaryTile
          label={`Paid (${confirmed} confirmed)`}
          value={paid}
          color={paid === confirmed && confirmed > 0 ? 'text-[#39ff14]' : 'text-gray-400'}
        />
      </div>

      {vacancies > 0 && (
        <div className="rounded border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300 font-mono">
          ⚠ {vacancies} open {vacancies === 1 ? 'slot' : 'slots'} — you need to find{' '}
          {vacancies === 1 ? 'a replacement' : `${vacancies} replacements`} before the draft.
        </div>
      )}

      {/* Member table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 text-left">
              <th className="pb-2 pr-4">Member</th>
              <th className="pb-2 pr-4">Team</th>
              <th className="pb-2 pr-4">Returning?</th>
              <th className="pb-2">Paid?</th>
            </tr>
          </thead>
          <tbody>
            {members
              .slice()
              .sort((a, b) => {
                const order = { yes: 0, maybe: 1, no: 2 }
                const aOrder = a.pre_season_returning ? order[a.pre_season_returning] : 3
                const bOrder = b.pre_season_returning ? order[b.pre_season_returning] : 3
                if (aOrder !== bOrder) return aOrder - bOrder
                return a.name.localeCompare(b.name)
              })
              .map((member) => {
                const isConfirmed = member.pre_season_returning === 'yes'
                const isSaving = savingId === member.id

                return (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-900 ${
                      member.pre_season_returning === 'yes'
                        ? 'bg-[#0a120a]'
                        : member.pre_season_returning === 'no'
                        ? 'bg-[#120a0a]'
                        : ''
                    }`}
                  >
                    <td className="py-3 pr-4 text-white font-semibold">
                      {member.name}
                      {isSaving && (
                        <span className="ml-2 text-gray-600 text-xs">saving…</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs">
                        {member.assigned_team}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={member.pre_season_returning ?? ''}
                        disabled={isSaving || isPending}
                        onChange={(e) => {
                          const val = e.target.value as Returning | ''
                          updateMember(member.id, 'returning', val === '' ? null : val)
                        }}
                        className={`bg-gray-900 border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 cursor-pointer ${
                          member.pre_season_returning === 'yes'
                            ? 'border-[#39ff14]/40 text-[#39ff14]'
                            : member.pre_season_returning === 'no'
                            ? 'border-red-800 text-red-400'
                            : member.pre_season_returning === 'maybe'
                            ? 'border-amber-700 text-amber-400'
                            : 'border-gray-700 text-gray-500'
                        }`}
                      >
                        <option value="">— unset —</option>
                        <option value="yes">Yes</option>
                        <option value="maybe">Maybe</option>
                        <option value="no">No</option>
                      </select>
                    </td>
                    <td className="py-3">
                      {isConfirmed ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={member.pre_season_paid}
                            disabled={isSaving || isPending}
                            onChange={(e) =>
                              updateMember(member.id, 'paid', e.target.checked)
                            }
                            className="w-4 h-4 accent-[#39ff14] cursor-pointer"
                          />
                          <span
                            className={
                              member.pre_season_paid ? 'text-[#39ff14]' : 'text-gray-500'
                            }
                          >
                            {member.pre_season_paid ? 'Paid' : 'Not paid'}
                          </span>
                        </label>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-[#111] px-4 py-3">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
    </div>
  )
}
