'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DraftRankingsBoard from './DraftRankingsBoard'
import type { TeamStat } from './DraftRankingsBoard'

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
  teamStats: TeamStat[]
}

const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CIN', 'CWS', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'ATH',
  'PHI', 'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

export default function DraftRoom({
  leagueId,
  leagueSlug,
  members,
  activeDraft,
  draftPicks,
  teamStats,
}: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [draftMode, setDraftMode] = useState<'random-assign' | 'double-blind'>('random-assign')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Double-blind draw state
  const [drawnMember, setDrawnMember] = useState<Member | null>(null)
  const [drawnTeam, setDrawnTeam]     = useState<string | null>(null)

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

        <DraftRankingsBoard teamStats={teamStats} pickedTeams={pickedTeams} />
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

        <DraftRankingsBoard teamStats={teamStats} pickedTeams={pickedTeams} />
      </div>
    )
  }

  // Double-blind helpers
  const pickedMemberIds = new Set(draftPicks.map((p) => p.member_id))
  const unpickedMembers = members.filter((m) => !pickedMemberIds.has(m.id))

  const handleDrawName = () => {
    if (unpickedMembers.length === 0) return
    const idx = Math.floor(Math.random() * unpickedMembers.length)
    setDrawnMember(unpickedMembers[idx])
    setDrawnTeam(null)
  }

  const handleDrawTeam = () => {
    if (availableTeams.length === 0) return
    const idx = Math.floor(Math.random() * availableTeams.length)
    setDrawnTeam(availableTeams[idx])
  }

  const handleConfirmPick = async () => {
    if (!drawnMember || !drawnTeam) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/league/${leagueSlug}/draft/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: drawnMember.id, team_abbr: drawnTeam }),
      })
      if (!res.ok) throw new Error('Failed to confirm pick')
      setDrawnMember(null)
      setDrawnTeam(null)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Error confirming pick')
    } finally {
      setIsLoading(false)
    }
  }

  // Draft in progress - Double-Blind Draw mode
  const phase = !drawnMember ? 'draw-name' : !drawnTeam ? 'draw-team' : 'confirm'

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-800 bg-[#111] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">📦 Double-Blind Draw</h2>
          <div className="text-sm text-gray-400 font-mono">
            {draftPicks.length} / {members.length} picked
          </div>
        </div>

        {draftPicks.length === members.length ? (
          /* All done */
          <button
            onClick={handleCompleteDraft}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:opacity-50 mb-6"
          >
            ✓ Complete Draft
          </button>
        ) : (
          /* Draw flow */
          <div className="space-y-4 mb-6">

            {/* Step 1: Draw Name */}
            <div className={`rounded-lg border p-4 transition-colors ${phase === 'draw-name' ? 'border-[#39ff14] bg-[#0d1a0d]' : 'border-gray-800 bg-[#0a0a0a]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-1">STEP 1 — DRAW NAME</div>
                  {drawnMember ? (
                    <div className="text-2xl font-black text-[#39ff14]">{drawnMember.name}</div>
                  ) : (
                    <div className="text-gray-600 text-sm">{unpickedMembers.length} members remaining</div>
                  )}
                </div>
                <button
                  onClick={handleDrawName}
                  disabled={isLoading || unpickedMembers.length === 0}
                  className="px-5 py-2 bg-[#39ff14] text-black font-bold rounded hover:bg-[#2fd400] disabled:opacity-40 text-sm"
                >
                  {drawnMember ? '↩ Re-draw Name' : '🎲 Draw Name'}
                </button>
              </div>
            </div>

            {/* Step 2: Draw Team */}
            <div className={`rounded-lg border p-4 transition-colors ${
              phase === 'draw-team' ? 'border-yellow-500 bg-[#1a1500]' :
              phase === 'confirm'   ? 'border-gray-700 bg-[#0a0a0a]' :
              'border-gray-800 bg-[#0a0a0a] opacity-40'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-1">STEP 2 — DRAW TEAM</div>
                  {drawnTeam ? (
                    <div className="text-2xl font-black text-yellow-400 font-mono">{drawnTeam}</div>
                  ) : (
                    <div className="text-gray-600 text-sm">{availableTeams.length} teams remaining</div>
                  )}
                </div>
                <button
                  onClick={handleDrawTeam}
                  disabled={isLoading || !drawnMember || availableTeams.length === 0}
                  className="px-5 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 disabled:opacity-40 text-sm"
                >
                  {drawnTeam ? '↩ Re-draw Team' : '🎲 Draw Team'}
                </button>
              </div>
            </div>

            {/* Step 3: Confirm */}
            {phase === 'confirm' && (
              <div className="rounded-lg border border-[#39ff14] bg-[#0d1a0d] p-4">
                <div className="text-xs text-gray-500 font-mono mb-2">STEP 3 — CONFIRM PAIRING</div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">
                    <span className="text-[#39ff14]">{drawnMember!.name}</span>
                    <span className="text-gray-500 mx-3">→</span>
                    <span className="font-mono text-white bg-[#39ff14] text-black px-2 py-0.5 rounded">{drawnTeam}</span>
                  </div>
                  <button
                    onClick={handleConfirmPick}
                    disabled={isLoading}
                    className="px-5 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-40 text-sm"
                  >
                    ✓ Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Picks log */}
        {draftPicks.length > 0 && (
          <div className="rounded border border-gray-800 overflow-hidden">
            <div className="bg-[#0a0a0a] px-4 py-2 text-xs text-gray-500 font-mono border-b border-gray-800">
              PICKS LOG
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[...draftPicks].reverse().map((pick, idx) => {
                  const member = members.find((m) => m.id === pick.member_id)
                  return (
                    <tr key={pick.id} className="border-b border-gray-900 hover:bg-[#0a0a0a]">
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs w-8">
                        #{draftPicks.length - idx}
                      </td>
                      <td className="px-4 py-2 text-white font-semibold">
                        {member?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="px-2 py-0.5 rounded bg-[#39ff14] text-black font-mono font-bold text-xs">
                          {pick.team_abbr}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3"
            />
            Auto-refresh every 2 seconds
          </label>
        </div>
      </div>

      <DraftRankingsBoard
        teamStats={teamStats}
        pickedTeams={pickedTeams}
      />
    </div>
  )
}
