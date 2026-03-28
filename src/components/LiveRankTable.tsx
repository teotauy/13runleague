'use client'

import Link from 'next/link'

interface GameEntry {
  gamePk: number
  awayTeam: string
  homeTeam: string
  awayScore?: number
  homeScore?: number
  gameStatus?: string // 'Preview' | 'Live' | 'Final'
  inning?: number
  isTopInning?: boolean
  awayProb: number // P(13) for away team
  homeProb: number // P(13) for home team
}

interface LiveRankTableProps {
  games: GameEntry[]
  // If provided, shows the Owner column (league view behind password)
  teamOwners?: Record<string, string> // team abbreviation -> owner name
  slug?: string // league slug for linking to player pages
}

// ── Row model: one per team ──────────────────────────────────────────────────

interface TeamRow {
  gamePk: number
  team: string
  opponent: string
  isHome: boolean
  score?: number
  opponentScore?: number
  gameStatus: string // 'Preview' | 'Live' | 'Final'
  inning?: number
  isTopInning?: boolean
  prob: number
  owner?: string
}

// ── Sorting tiers ────────────────────────────────────────────────────────────

type Tier = 'liveHot' | 'live' | 'preview' | 'finalHit' | 'finalMiss'

function getTier(row: TeamRow): Tier {
  const { gameStatus, score } = row
  if (gameStatus === 'Live' && score !== undefined && score >= 9) return 'liveHot'
  if (gameStatus === 'Live') return 'live'
  if (gameStatus === 'Preview') return 'preview'
  if (gameStatus === 'Final' && score === 13) return 'finalHit'
  return 'finalMiss'
}

const TIER_ORDER: Record<Tier, number> = {
  liveHot: 0,
  live: 1,
  preview: 2,
  finalHit: 3,
  finalMiss: 4,
}

function sortRows(a: TeamRow, b: TeamRow): number {
  const ta = getTier(a)
  const tb = getTier(b)
  if (TIER_ORDER[ta] !== TIER_ORDER[tb]) return TIER_ORDER[ta] - TIER_ORDER[tb]

  // Within finalMiss: sort by proximity to 13
  if (ta === 'finalMiss' && tb === 'finalMiss') {
    const proxA = Math.abs((a.score ?? 0) - 13)
    const proxB = Math.abs((b.score ?? 0) - 13)
    if (proxA !== proxB) return proxA - proxB
  }

  // All other tiers: sort by P(13) descending
  return b.prob - a.prob
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveRankTable({ games, teamOwners, slug }: LiveRankTableProps) {
  // Build two rows per game
  const rows: TeamRow[] = []

  for (const g of games) {
    const status = g.gameStatus ?? 'Preview'

    rows.push({
      gamePk: g.gamePk,
      team: g.awayTeam,
      opponent: g.homeTeam,
      isHome: false,
      score: g.awayScore,
      opponentScore: g.homeScore,
      gameStatus: status,
      inning: g.inning,
      isTopInning: g.isTopInning,
      prob: g.awayProb,
      owner: teamOwners?.[g.awayTeam],
    })

    rows.push({
      gamePk: g.gamePk,
      team: g.homeTeam,
      opponent: g.awayTeam,
      isHome: true,
      score: g.homeScore,
      opponentScore: g.awayScore,
      gameStatus: status,
      inning: g.inning,
      isTopInning: g.isTopInning,
      prob: g.homeProb,
      owner: teamOwners?.[g.homeTeam],
    })
  }

  rows.sort(sortRows)

  const hasLive = rows.some((r) => r.gameStatus === 'Live')
  const showOwner = !!teamOwners

  return (
    <div className="module-card">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        {hasLive && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
        <h2 className="text-lg font-bold text-white tracking-wide">LIVE RANKINGS</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Subtle header */}
          <thead>
            <tr className="text-[11px] text-gray-600 uppercase tracking-wider font-mono">
              <th className="text-left py-1.5 px-2 w-8">#</th>
              <th className="text-left py-1.5 px-2">Team</th>
              <th className="text-left py-1.5 px-2 hidden sm:table-cell">Opp</th>
              <th className="text-center py-1.5 px-2">Score</th>
              <th className="text-center py-1.5 px-2">Inn</th>
              <th className="text-right py-1.5 px-2">P(13)</th>
              {showOwner && <th className="text-left py-1.5 px-2">Owner</th>}
              <th className="w-6" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <RankRow
                key={`${row.gamePk}-${row.team}`}
                row={row}
                rank={i + 1}
                showOwner={showOwner}
                slug={slug}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Single row ───────────────────────────────────────────────────────────────

function RankRow({
  row,
  rank,
  showOwner,
  slug,
}: {
  row: TeamRow
  rank: number
  showOwner: boolean
  slug?: string
}) {
  const tier = getTier(row)
  const hit13 = row.score === 13
  const isHot = tier === 'liveHot' || (row.gameStatus === 'Live' && row.prob >= 0.7)
  const isFinalMiss = tier === 'finalMiss'
  const isFinalHit = tier === 'finalHit'
  const isPreview = tier === 'preview'

  // Border-left color
  const borderLeft = hit13
    ? '3px solid #39ff14'
    : isHot
      ? '3px solid #f97316'
      : '3px solid transparent'

  // Row background on hover
  const rowClass = [
    'border-b border-gray-800/50 transition-colors hover:bg-white/[0.03]',
    isFinalMiss ? 'opacity-50' : '',
    isFinalHit ? 'bg-green-950/20' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Score display color
  const scoreColor = hit13 ? '#39ff14' : 'white'

  // Prob display
  const probPct = (row.prob * 100).toFixed(1)
  const probColor = row.prob >= 0.7 ? '#ef4444' : row.prob >= 0.4 ? '#f97316' : row.prob >= 0.15 ? '#eab308' : '#6b7280'

  // Opponent label
  const oppLabel = row.isHome ? `vs ${row.opponent}` : `@ ${row.opponent}`

  // Inning / status display
  let inningDisplay: string | null = null
  if (row.gameStatus === 'Live' && row.inning !== undefined) {
    const arrow = row.isTopInning ? '▲' : '▼'
    inningDisplay = `${arrow}${row.inning}`
  } else if (row.gameStatus === 'Final') {
    inningDisplay = 'FINAL'
  }

  return (
    <tr className={rowClass} style={{ borderLeft }}>
      {/* Rank */}
      <td className="py-2 px-2 font-mono text-gray-500 text-xs">{rank}</td>

      {/* Team */}
      <td className="py-2 px-2">
        <Link
          href={`/teams/${row.team}`}
          className={`font-mono font-bold text-sm hover:underline ${
            hit13 ? 'text-[#39ff14]' : isPreview ? 'text-gray-400' : 'text-white'
          }`}
        >
          {row.team}
        </Link>
      </td>

      {/* Opponent (hidden on mobile) */}
      <td className="py-2 px-2 hidden sm:table-cell">
        <span className="text-xs text-gray-500 font-mono">{oppLabel}</span>
      </td>

      {/* Score */}
      <td className="py-2 px-2 text-center font-mono font-bold text-sm" style={{ color: scoreColor }}>
        {row.score !== undefined ? (
          <>
            <span className={row.score === 13 ? 'text-[#39ff14]' : 'text-white'}>{row.score}</span>
            <span className="text-gray-600 mx-0.5">-</span>
            <span className={row.opponentScore === 13 ? 'text-[#39ff14]' : 'text-gray-400'}>
              {row.opponentScore}
            </span>
          </>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>

      {/* Inning */}
      <td className="py-2 px-2 text-center font-mono text-xs">
        {row.gameStatus === 'Live' && inningDisplay ? (
          <span className="text-green-400">{inningDisplay}</span>
        ) : row.gameStatus === 'Final' ? (
          <span className={hit13 ? 'text-[#39ff14]/60' : 'text-gray-600'}>{inningDisplay}</span>
        ) : (
          <span className="text-gray-600">PRE</span>
        )}
      </td>

      {/* P(13) */}
      <td className="py-2 px-2 text-right font-mono font-bold text-sm" style={{ color: probColor }}>
        {probPct}%
      </td>

      {/* Owner */}
      {showOwner && (
        <td className="py-2 px-2 text-sm">
          {row.owner ? (
            slug ? (
              <Link
                href={`/league/${slug}/player/${encodeURIComponent(row.owner)}`}
                className="text-gray-400 hover:text-white hover:underline truncate max-w-[100px] inline-block"
              >
                {row.owner}
              </Link>
            ) : (
              <span className="text-gray-400 truncate max-w-[100px] inline-block">{row.owner}</span>
            )
          ) : (
            <span className="text-gray-700">-</span>
          )}
        </td>
      )}

      {/* Hot indicator */}
      <td className="py-2 px-1 text-center w-6">
        {hit13 ? (
          <span>⚡</span>
        ) : isHot ? (
          <span className="animate-pulse">🔥</span>
        ) : null}
      </td>
    </tr>
  )
}
