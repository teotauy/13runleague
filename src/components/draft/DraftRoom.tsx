'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  assigned_team: string
}

interface DraftSession {
  id: string
  draft_mode: string
  draft_status: string
}

interface DraftPick {
  id: string
  member_id: string
  team_abbr: string
  pick_order: number
}

interface Props {
  leagueId: string
  leagueSlug: string
  members: Member[]
  activeDraft: DraftSession | null
  draftPicks: DraftPick[]
}

const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CLE', 'COL', 'DET', 'HOU',
  'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK', 'PHI',
  'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

export default function DraftRoom({
  leagueId,
  leagueSlug,
  members,
  activeDraft,
  draftPicks,
}: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [draftMode, setDraftMode] = useState<'random-assign' | 'double-blind'>('random-assign')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh every 2 seconds when draft is in progress
  useEffect(() => {
    if (!activeDraft || activeDraft.draft_status === 'completed' || !autoRefresh) return

    const interval = setInterval(() => {
      router.refresh()
    }, 2000)

    return () => clearInterval(interval)
  }, [activeDraft, autoRefresh, router])

  const pickedTeams = new Set(draftPicks.map((p) => p.team_abbr))
  const availableTeams = MLB_TEAMS.filter((t) => !pickedTeams.has(t))

  const handleStartDraft = async (mode: 'random-assign' | 'double-blind') => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/draft/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_mode: mode }),
      })

      if (!res.ok) throw new Error('Failed to start draft')

      setDraftMode(mode)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error starting draft')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRandomAssign = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/draft/random-assign`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to randomize')

      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error running random assign')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePickTeam = async (teamAbbr: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/draft/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_abbr: teamAbbr }),
      })

      if (!res.ok) throw new Error('Failed to pick team')

      setSelectedTeam(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error picking team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteDraft = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/draft/complete`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to complete draft')

      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error completing draft')
    } finally {
      setIsLoading(false)
    }
  }

  // No draft in progress
  if (!activeDraft) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-800 bg-[#111] p-8">
          <h2 className="text-xl font-bold mb-4">Start a Draft</h2>
          <p className="text-gray-400 mb-6">Choose a draft mode to begin:</p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStartDraft('random-assign')}
              disabled={isLoading}
              className="p-6 rounded-lg border-2 border-gray-700 hover:border-[#39ff14] bg-[#0a0a0a] text-center transition-colors disabled:opacity-50"
            >
              <div className="text-2xl mb-2">🎲</div>
              <div className="font-bold text-white mb-2">Random Assign</div>
              <div className="text-sm text-gray-500">All teams randomly assigned instantly</div>
            </button>

            <button
              onClick={() => handleStartDraft('double-blind')}
              disabled={isLoading}
              className="p-6 rounded-lg border-2 border-gray-700 hover:border-[#39ff14] bg-[#0a0a0a] text-center transition-colors disabled:opacity-50"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-bold text-white mb-2">Double-Blind Draw</div>
              <div className="text-sm text-gray-500">Members pick sealed envelopes one by one</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Draft in progress - Random Assign mode
  if (activeDraft.draft_mode === 'random-assign') {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-800 bg-[#111] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🎲 Random Assign</h2>
            <div className="text-sm text-gray-400">
              {draftPicks.length} / {members.length} teams assigned
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleRandomAssign}
              disabled={isLoading || draftPicks.length > 0}
              className="px-4 py-3 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50"
            >
              {draftPicks.length > 0 ? '✓ Assigned' : 'Randomize All'}
            </button>
            {draftPicks.length === members.length && (
              <button
                onClick={handleCompleteDraft}
                disabled={isLoading}
                className="px-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Complete Draft
              </button>
            )}
          </div>

          {/* Results Table */}
          <div className="rounded border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400">Member</th>
                  <th className="text-left px-4 py-3 text-gray-400">Team</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const pick = draftPicks.find((p) => p.member_id === member.id)
                  return (
                    <tr key={member.id} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                      <td className="px-4 py-3 text-white font-semibold">{member.name}</td>
                      <td className="px-4 py-3">
                        {pick ? (
                          <span className="px-2 py-1 rounded bg-[#39ff14] text-black font-mono font-bold text-sm">
                            {pick.team_abbr}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Draft in progress - Double-Blind Draw mode
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-800 bg-[#111] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">📦 Double-Blind Draw</h2>
          <div className="text-sm text-gray-400">
            {draftPicks.length} / {members.length} teams picked
          </div>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Pick a Team:</label>
            <select
              value={selectedTeam || ''}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={isLoading}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-[#39ff14]"
            >
              <option value="">Select team...</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">&nbsp;</label>
            <button
              onClick={() => selectedTeam && handlePickTeam(selectedTeam)}
              disabled={!selectedTeam || isLoading}
              className="w-full px-4 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-50"
            >
              Pick Team
            </button>
          </div>
        </div>

        {draftPicks.length === members.length && (
          <div className="mb-6">
            <button
              onClick={handleCompleteDraft}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50"
            >
              ✓ Complete Draft
            </button>
          </div>
        )}

        {/* Picks Made */}
        <div className="rounded border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400">Pick #</th>
                <th className="text-left px-4 py-3 text-gray-400">Team</th>
              </tr>
            </thead>
            <tbody>
              {draftPicks.map((pick, idx) => (
                <tr key={pick.id} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                  <td className="px-4 py-3 text-gray-400">#{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded bg-[#39ff14] text-black font-mono font-bold text-sm">
                      {pick.team_abbr}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            Auto-refresh every 2 seconds
          </label>
        </div>
      </div>
    </div>
  )
}
