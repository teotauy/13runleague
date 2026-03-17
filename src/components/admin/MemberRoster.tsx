'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TEAM_ABBRS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CLE', 'COL', 'DET', 'HOU',
  'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK', 'PHI',
  'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

interface Member {
  id: string
  name: string
  assigned_team: string
  phone?: string
  email?: string
  is_active?: boolean
}

interface Props {
  leagueId: string
  leagueSlug: string
  members: Member[]
  previousNames?: string[]
  yearsPlayedByName?: Record<string, number[]>
}

function yearRange(years: number[]): string {
  if (!years || years.length === 0) return '—'
  const sorted = [...years].sort((a, b) => a - b)
  if (sorted.length === 1) return String(sorted[0])
  return `${sorted[0]}–${sorted[sorted.length - 1]}`
}

type Filter = 'active' | 'alumni' | 'all'

export default function MemberRoster({ leagueId, leagueSlug, members, previousNames = [], yearsPlayedByName = {} }: Props) {
  const router = useRouter()
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', team: '', phone: '', email: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('active')

  const filtered = members.filter((m) => {
    const active = m.is_active !== false // default true if null/undefined
    if (filter === 'active') return active
    if (filter === 'alumni') return !active
    return true
  })

  function getYears(member: Member): number[] {
    return yearsPlayedByName[member.name.trim().toLowerCase()] ?? []
  }

  const handleOpenAdd = () => {
    setFormData({ name: '', team: '', phone: '', email: '' })
    setEditingId(null)
    setIsAddingMember(true)
  }

  const handleOpenEdit = (member: Member) => {
    setFormData({
      name: member.name,
      team: member.assigned_team,
      phone: member.phone ?? '',
      email: member.email ?? '',
    })
    setEditingId(member.id)
    setIsAddingMember(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const endpoint = editingId
        ? `/api/league/${leagueSlug}/members/${editingId}`
        : `/api/league/${leagueSlug}/members`
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          assigned_team: formData.team,
          phone: formData.phone || null,
          email: formData.email || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.details ? ` — ${body.details}` : ''
        throw new Error((body?.error ?? `HTTP ${res.status}`) + detail)
      }
      setIsAddingMember(false)
      router.refresh()
    } catch (err) {
      alert(`Error saving member: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (member: Member) => {
    const newActive = member.is_active === false // if currently alumni, reactivate
    const label = newActive ? 'Reactivate' : 'Make Alumni'
    if (!confirm(`${label} ${member.name}?`)) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      })
      if (!res.ok) throw new Error('Failed to update member')
      router.refresh()
    } catch (err) {
      alert('Error updating member')
    } finally {
      setIsLoading(false)
    }
  }

  const alumniCount = members.filter((m) => m.is_active === false).length
  const activeCount = members.filter((m) => m.is_active !== false).length

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4">
        {/* Filter tabs */}
        <div className="flex rounded overflow-hidden border border-gray-800 text-xs font-mono">
          {([['active', `Active (${activeCount})`], ['alumni', `Alumni (${alumniCount})`], ['all', 'All']] as [Filter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 transition-colors ${filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleOpenAdd}
          disabled={isAddingMember}
          className="px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50 text-sm"
        >
          + Add Member
        </button>
      </div>

      {/* Add/Edit Modal */}
      {isAddingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Member' : 'Add Member'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  list="previous-players"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                  placeholder="e.g. John Smith"
                />
                {previousNames.length > 0 && (
                  <datalist id="previous-players">
                    {previousNames.map((name) => <option key={name} value={name} />)}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">MLB Team (optional)</label>
                <select
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                >
                  <option value="">Select team...</option>
                  {TEAM_ABBRS.map((abbr) => <option key={abbr} value={abbr}>{abbr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone (optional)</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]" placeholder="+1234567890" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email (optional)</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]" placeholder="user@example.com" />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50">
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setIsAddingMember(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="rounded-lg border border-gray-800 bg-[#111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0a0a0a]">
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Name</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Years</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Team</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold hidden sm:table-cell">Contact</th>
              <th className="text-right px-4 py-3 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const years = getYears(member)
              const isAlumni = member.is_active === false
              return (
                <tr key={member.id} className={`border-b border-gray-900 hover:bg-[#0a0a0a] ${isAlumni ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="text-white font-semibold">{member.name}</span>
                    {isAlumni && <span className="ml-2 text-[10px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">alumni</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{yearRange(years)}</td>
                  <td className="px-4 py-3">
                    {member.assigned_team ? (
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs font-mono">{member.assigned_team}</span>
                    ) : (
                      <span className="text-gray-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="text-gray-400 text-xs">{member.email ?? '—'}</div>
                    {member.phone && <div className="text-gray-600 text-xs">{member.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => handleOpenEdit(member)}
                      className="text-[#39ff14] hover:text-[#2fd400] font-semibold text-xs">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(member)}
                      className={`font-semibold text-xs ${isAlumni ? 'text-blue-400 hover:text-blue-300' : 'text-yellow-600 hover:text-yellow-500'}`}
                    >
                      {isAlumni ? 'Reactivate' : 'Alumni'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {filter === 'alumni' ? 'No alumni yet' : filter === 'active' ? 'No active members' : 'No members yet'}
          </div>
        )}
      </div>
    </div>
  )
}
