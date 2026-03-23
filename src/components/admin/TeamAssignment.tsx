'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MLB_TEAMS = [
  { abbr: 'ARI', name: 'Arizona Diamondbacks' },
  { abbr: 'ATL', name: 'Atlanta Braves' },
  { abbr: 'BAL', name: 'Baltimore Orioles' },
  { abbr: 'BOS', name: 'Boston Red Sox' },
  { abbr: 'CHC', name: 'Chicago Cubs' },
  { abbr: 'CIN', name: 'Cincinnati Reds' },
  { abbr: 'CWS', name: 'Chicago White Sox' },
  { abbr: 'CLE', name: 'Cleveland Guardians' },
  { abbr: 'COL', name: 'Colorado Rockies' },
  { abbr: 'DET', name: 'Detroit Tigers' },
  { abbr: 'HOU', name: 'Houston Astros' },
  { abbr: 'KC', name: 'Kansas City Royals' },
  { abbr: 'LAA', name: 'Los Angeles Angels' },
  { abbr: 'LAD', name: 'Los Angeles Dodgers' },
  { abbr: 'MIA', name: 'Miami Marlins' },
  { abbr: 'MIL', name: 'Milwaukee Brewers' },
  { abbr: 'MIN', name: 'Minnesota Twins' },
  { abbr: 'NYM', name: 'New York Mets' },
  { abbr: 'NYY', name: 'New York Yankees' },
  { abbr: 'ATH', name: 'Athletics' },
  { abbr: 'PHI', name: 'Philadelphia Phillies' },
  { abbr: 'PIT', name: 'Pittsburgh Pirates' },
  { abbr: 'SD', name: 'San Diego Padres' },
  { abbr: 'SEA', name: 'Seattle Mariners' },
  { abbr: 'SF', name: 'San Francisco Giants' },
  { abbr: 'STL', name: 'St. Louis Cardinals' },
  { abbr: 'TB', name: 'Tampa Bay Rays' },
  { abbr: 'TEX', name: 'Texas Rangers' },
  { abbr: 'TOR', name: 'Toronto Blue Jays' },
  { abbr: 'WSH', name: 'Washington Nationals' },
]

interface Member {
  id: string
  name: string
  assigned_team: string
}

interface Props {
  members: Member[]
  leagueSlug: string
}

interface Assignment {
  [memberId: string]: string
}

export default function TeamAssignment({ members, leagueSlug }: Props) {
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment>(
    members.reduce((acc, m) => ({ ...acc, [m.id]: m.assigned_team }), {})
  )
  const [isLoading, setIsLoading] = useState(false)

  const assignedTeams = new Set(Object.values(assignments).filter(Boolean))
  const availableTeams = MLB_TEAMS.filter((t) => !assignedTeams.has(t.abbr))

  const handleAssignTeam = (memberId: string, teamAbbr: string) => {
    setAssignments((prev) => ({
      ...prev,
      [memberId]: teamAbbr,
    }))
  }

  const handleRandomDraw = async () => {
    if (!confirm('Auto-assign remaining teams randomly to members without teams?')) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/teams/random-assign`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to randomize')

      const data = await res.json()
      setAssignments(data.assignments)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error randomizing teams')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/teams/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      })

      if (!res.ok) throw new Error('Failed to save assignments')

      router.refresh()
      alert('Teams assigned successfully!')
    } catch (err) {
      console.error(err)
      alert('Error saving assignments')
    } finally {
      setIsLoading(false)
    }
  }

  const unassignedMembers = members.filter((m) => !assignments[m.id])

  return (
    <div className="space-y-6">
      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRandomDraw}
          disabled={isLoading || unassignedMembers.length === 0}
          className="px-4 py-2 bg-amber-600 text-white font-bold rounded hover:bg-amber-700 disabled:opacity-50"
        >
          🎲 Random Draw
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : '✓ Save Assignments'}
        </button>
      </div>

      {/* Status */}
      <div className="text-sm text-gray-400">
        <p>
          <span className="text-[#39ff14] font-bold">{assignedTeams.size}</span> teams assigned,{' '}
          <span className="text-amber-400 font-bold">{availableTeams.length}</span> available,{' '}
          <span className="text-gray-500">{unassignedMembers.length} members without teams</span>
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Members Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">Members</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-3 rounded border border-gray-800 bg-[#111] hover:bg-[#1a1a1a]"
              >
                <div className="text-sm font-semibold text-white mb-2">{member.name}</div>
                {assignments[member.id] ? (
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded bg-[#39ff14] text-black font-mono font-bold text-sm">
                      {assignments[member.id]}
                    </span>
                    <button
                      onClick={() => handleAssignTeam(member.id, '')}
                      className="text-xs text-gray-500 hover:text-red-400"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No team assigned</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Available Teams Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white">Available Teams</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {availableTeams.map((team) => (
              <div
                key={team.abbr}
                className="p-3 rounded border border-gray-800 bg-[#111] cursor-pointer hover:bg-[#1a1a1a] hover:border-[#39ff14] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-bold text-white">{team.abbr}</div>
                    <div className="text-xs text-gray-500">{team.name}</div>
                  </div>
                  {unassignedMembers.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignTeam(e.target.value, team.abbr)
                          e.target.value = ''
                        }
                      }}
                      className="px-2 py-1 bg-[#0a0a0a] border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-[#39ff14]"
                    >
                      <option value="">Assign to...</option>
                      {unassignedMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
