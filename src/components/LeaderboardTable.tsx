'use client'

import { useState } from 'react'
import Link from 'next/link'
import Tooltip from './Tooltip'

type SortCol = 'player' | 'team' | 'prob' | 'streak' | 'wins' | 'won'
type Dir = 'asc' | 'desc'

interface MemberData {
  id: string
  name: string
  assigned_team: string
}

interface StreakData {
  current_streak: number
  longest_streak: number
}

interface GameData {
  teams: {
    away: { team: { abbreviation: string } }
    home: { team: { abbreviation: string } }
  }
}

export interface LeaderboardRow {
  member: MemberData
  streak: StreakData | undefined
  todayGame: GameData | null
  todayProb: number | null
  seasonWins: number
  seasonWon: number
}

export default function LeaderboardTable({
  rows,
  slug,
}: {
  rows: LeaderboardRow[]
  slug: string
}) {
  const [sortCol, setSortCol] = useState<SortCol>('prob')
  const [dir, setDir] = useState<Dir>('desc')

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortCol(col)
      setDir(col === 'player' || col === 'team' ? 'asc' : 'desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortCol === 'player') {
      const cmp = a.member.name.localeCompare(b.member.name)
      return dir === 'asc' ? cmp : -cmp
    }
    if (sortCol === 'team') {
      const cmp = a.member.assigned_team.localeCompare(b.member.assigned_team)
      return dir === 'asc' ? cmp : -cmp
    }
    let av: number, bv: number
    if (sortCol === 'prob') {
      av = a.todayProb ?? -1
      bv = b.todayProb ?? -1
    } else if (sortCol === 'streak') {
      av = a.streak?.current_streak ?? 0
      bv = b.streak?.current_streak ?? 0
    } else if (sortCol === 'wins') {
      av = a.seasonWins
      bv = b.seasonWins
    } else {
      av = a.seasonWon
      bv = b.seasonWon
    }
    return dir === 'desc' ? bv - av : av - bv
  })

  function Arrow({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-gray-700 ml-1">↕</span>
    return <span className="text-[#39ff14] ml-1">{dir === 'desc' ? '↓' : '↑'}</span>
  }

  function SortTh({
    label,
    col,
    title,
    explanation,
  }: {
    label: string
    col: SortCol
    title?: string
    explanation?: string
  }) {
    return (
      <th
        title={title}
        className="pb-2 pr-4 cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {explanation ? (
          <Tooltip label={label} explanation={explanation}>
            {label}
          </Tooltip>
        ) : (
          label
        )}
        <Arrow col={col} />
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 text-left">
            <SortTh label="Player" col="player" />
            <SortTh label="Team" col="team" />
            <th className="pb-2 pr-4">Today</th>
            <SortTh label="P(13)" col="prob" explanation="Probability your team scores exactly 13 runs today. Pre-game Poisson model (season stats, park factors, pitcher). Updates live each inning during games." />
            <SortTh label="Drought" col="streak" title="Weeks since this player's last win" />
            <SortTh label="Wins" col="wins" title="Winning weeks this season" />
            <SortTh label="$$$" col="won" title="Money won this season" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ member, streak, todayGame, todayProb, seasonWins, seasonWon }) => (
            <tr key={member.id} className="border-b border-gray-900 hover:bg-[#111]">
              <td className="py-3 pr-4">
                <Link
                  href={`/league/${slug}/player/${member.id}`}
                  className="text-white font-semibold hover:text-[#39ff14] transition-colors"
                >
                  {member.name}
                </Link>
              </td>
              <td className="py-3 pr-4">
                <Link href={`/teams/${member.assigned_team}`} className="px-2 py-0.5 rounded bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white transition-colors">
                  {member.assigned_team}
                </Link>
              </td>
              <td className="py-3 pr-4 text-gray-400">
                {todayGame
                  ? `${todayGame.teams.away.team.abbreviation} @ ${todayGame.teams.home.team.abbreviation}`
                  : '—'}
              </td>
              <td className="py-3 pr-4">
                {todayProb !== null ? (
                  <span
                    className="font-bold"
                    style={{
                      color:
                        todayProb > 0.05
                          ? '#39ff14'
                          : todayProb > 0.02
                          ? '#f59e0b'
                          : '#9ca3af',
                    }}
                  >
                    {(todayProb * 100).toFixed(2)}%
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-3 pr-4 text-gray-400">{streak?.current_streak ?? 0}W</td>
              <td className="py-3 pr-4 text-gray-400">
                {seasonWins > 0 ? (
                  <span className="text-white font-semibold">{seasonWins}</span>
                ) : (
                  '0'
                )}
              </td>
              <td className="py-3 pr-4">
                {seasonWon > 0 ? (
                  <span className="text-[#39ff14] font-bold">${seasonWon.toLocaleString()}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
