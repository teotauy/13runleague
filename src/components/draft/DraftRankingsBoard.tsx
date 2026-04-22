'use client'

import { useState } from 'react'
import { getTeamColor } from '@/lib/teamColors'

export interface TeamStat {
  abbr: string
  leagueWins: number      // SUM(shares) from historical_results
  totalEarned: number     // SUM(total_won) from historical_results
  seasons: number         // years this team appeared in the league
  mlbHistory: number      // all-time 13-run games (Retrosheet)
}

type SortKey = 'leagueWins' | 'winRate' | 'earned' | 'war' | 'mlb'

const SORT_LABELS: Record<SortKey, string> = {
  leagueWins: 'League Wins',
  winRate:    'Win Rate',
  earned:     '$$ Earned',
  war:        'WAR ($/Win)',
  mlb:        'MLB History',
}

interface Props {
  teamStats: TeamStat[]
  pickedTeams: Set<string>
  /** callback for double-blind mode — clicking a row pre-fills the selector */
  onSelectTeam?: (abbr: string) => void
}

export default function DraftRankingsBoard({ teamStats, pickedTeams, onSelectTeam }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('leagueWins')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [availableOnly, setAvailableOnly] = useState(false)

  function winRate(s: TeamStat) {
    return s.seasons > 0 ? s.leagueWins / s.seasons : 0
  }
  function war(s: TeamStat) {
    return s.leagueWins > 0 ? s.totalEarned / s.leagueWins : 0
  }

  const getValue = (s: TeamStat): number => {
    switch (sortKey) {
      case 'leagueWins': return s.leagueWins
      case 'winRate':    return winRate(s)
      case 'earned':     return s.totalEarned
      case 'war':        return war(s)
      case 'mlb':        return s.mlbHistory
    }
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const dir = (key: SortKey) => {
    if (key !== sortKey) return '↕'
    return sortDir === 'desc' ? '↓' : '↑'
  }

  const rows = [...teamStats]
    .filter(s => !availableOnly || !pickedTeams.has(s.abbr))
    .sort((a, b) => {
      const diff = getValue(a) - getValue(b)
      return sortDir === 'desc' ? -diff : diff
    })

  const pickedCount = pickedTeams.size
  const totalTeams  = teamStats.length

  return (
    <div className="rounded-lg border border-gray-800 bg-[#111]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white">Team Rankings</h3>
          <span className="text-xs text-gray-500 font-mono">
            {pickedCount}/{totalTeams} picked
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={e => setAvailableOnly(e.target.checked)}
            className="w-3 h-3 accent-[#39ff14]"
          />
          Available only
        </label>
      </div>

      {/* Sort pills */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800 overflow-x-auto">
        {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`
              flex-shrink-0 px-3 py-1 rounded text-xs font-mono transition-colors
              ${sortKey === key
                ? 'bg-[#39ff14] text-black font-bold'
                : 'bg-[#0a0a0a] text-gray-400 border border-gray-700 hover:border-gray-500'}
            `}
          >
            {SORT_LABELS[key]} {dir(key)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left px-4 py-2 font-normal w-6">#</th>
              <th className="text-left px-4 py-2 font-normal">Team</th>
              <th
                className={`text-right px-3 py-2 cursor-pointer hover:text-white ${sortKey === 'leagueWins' ? 'text-[#39ff14]' : ''}`}
                onClick={() => handleSort('leagueWins')}
              >L.Wins</th>
              <th
                className={`text-right px-3 py-2 cursor-pointer hover:text-white ${sortKey === 'winRate' ? 'text-[#39ff14]' : ''}`}
                onClick={() => handleSort('winRate')}
              >W/Ssn</th>
              <th
                className={`text-right px-3 py-2 cursor-pointer hover:text-white ${sortKey === 'earned' ? 'text-[#39ff14]' : ''}`}
                onClick={() => handleSort('earned')}
              >$$</th>
              <th
                className={`text-right px-3 py-2 cursor-pointer hover:text-white ${sortKey === 'war' ? 'text-[#39ff14]' : ''}`}
                onClick={() => handleSort('war')}
              >WAR</th>
              <th
                className={`text-right px-3 py-2 cursor-pointer hover:text-white pr-4 ${sortKey === 'mlb' ? 'text-[#39ff14]' : ''}`}
                onClick={() => handleSort('mlb')}
              >MLB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, idx) => {
              const isPicked    = pickedTeams.has(s.abbr)
              const teamColor   = getTeamColor(s.abbr)
              const wr          = winRate(s)
              const warVal      = war(s)
              const noHistory   = s.seasons === 0

              return (
                <tr
                  key={s.abbr}
                  onClick={() => !isPicked && onSelectTeam?.(s.abbr)}
                  className={`
                    border-b border-gray-900 transition-colors
                    ${isPicked
                      ? 'opacity-30'
                      : onSelectTeam
                        ? 'cursor-pointer hover:bg-[#1a1a1a]'
                        : 'hover:bg-[#0f0f0f]'}
                  `}
                >
                  <td className="pl-4 pr-2 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {/* Team color swatch */}
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: teamColor.primaryColor }}
                      />
                      <span className={`font-bold ${isPicked ? 'line-through text-gray-400' : 'text-white'}`}>
                        {s.abbr}
                      </span>
                      {isPicked && (
                        <span className="text-gray-400 text-[10px]">picked</span>
                      )}
                    </div>
                  </td>
                  <td className={`text-right px-3 py-2 ${noHistory ? 'text-gray-400' : sortKey === 'leagueWins' ? 'text-[#39ff14] font-bold' : 'text-gray-300'}`}>
                    {noHistory ? '—' : s.leagueWins}
                  </td>
                  <td className={`text-right px-3 py-2 ${noHistory ? 'text-gray-400' : sortKey === 'winRate' ? 'text-[#39ff14] font-bold' : 'text-gray-400'}`}>
                    {noHistory ? '—' : wr.toFixed(1)}
                  </td>
                  <td className={`text-right px-3 py-2 ${noHistory ? 'text-gray-400' : sortKey === 'earned' ? 'text-[#39ff14] font-bold' : 'text-gray-400'}`}>
                    {noHistory ? '—' : `$${s.totalEarned.toLocaleString()}`}
                  </td>
                  <td className={`text-right px-3 py-2 ${s.leagueWins === 0 ? 'text-gray-400' : sortKey === 'war' ? 'text-[#39ff14] font-bold' : 'text-gray-400'}`}>
                    {s.leagueWins === 0 ? '—' : `$${Math.round(warVal)}`}
                  </td>
                  <td className={`text-right px-3 py-2 pr-4 ${sortKey === 'mlb' ? 'text-[#39ff14] font-bold' : 'text-gray-500'}`}>
                    {s.mlbHistory}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  All teams have been picked
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-800 text-[10px] text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
        <span><span className="text-gray-400">L.Wins</span> = 13-run wins in league history</span>
        <span><span className="text-gray-400">W/Ssn</span> = wins per season</span>
        <span><span className="text-gray-400">WAR</span> = $/win (solo &gt; split)</span>
        <span><span className="text-gray-400">MLB</span> = all-time 13-run games (1877–2025)</span>
      </div>
    </div>
  )
}
