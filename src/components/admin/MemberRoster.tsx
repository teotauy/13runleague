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
}

interface Props {
  leagueId: string
  leagueSlug: string
  members: Member[]
}

export default function MemberRoster({ leagueId, leagueSlug, members }: Props) {
  const router = useRouter()
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', team: '', phone: '', email: '' })
  const [isLoading, setIsLoading] = useState(false)

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

      if (!res.ok) throw new Error('Failed to save member')

      setIsAddingMember(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error saving member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (memberId: string) => {
    if (!confirm('Remove this member?')) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete member')

      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error deleting member')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Member Button */}
      <div className="flex justify-end">
        <button
          onClick={handleOpenAdd}
          disabled={isAddingMember}
          className="px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50"
        >
          + Add Member
        </button>
      </div>

      {/* Add/Edit Member Modal */}
      {isAddingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {editingId ? 'Edit Member' : 'Add Member'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                  placeholder="e.g. John Smith"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">MLB Team (optional)</label>
                <select
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                >
                  <option value="">Select team...</option>
                  {TEAM_ABBRS.map((abbr) => (
                    <option key={abbr} value={abbr}>
                      {abbr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
                  placeholder="user@example.com"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
                >
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
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Team</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 text-gray-400 font-semibold">Email</th>
              <th className="text-right px-4 py-3 text-gray-400 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                <td className="px-4 py-3 text-white font-semibold">{member.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 text-xs font-mono">
                    {member.assigned_team}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{member.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{member.email ?? '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="text-[#39ff14] hover:text-[#2fd400] font-semibold text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-red-500 hover:text-red-400 font-semibold text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">No members yet</div>
        )}
      </div>
    </div>
  )
}
