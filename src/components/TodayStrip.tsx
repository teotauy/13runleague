import Link from 'next/link'

export interface TodayEntry {
  memberName: string
  memberId?: string
  team: string
  gamePk: number | null
  gameStatus: string | null   // 'Preview' | 'Live' | 'Final' | null
  awayTeam: string | null
  homeTeam: string | null
  awayScore: number | null
  homeScore: number | null
  gameDate: string | null     // ISO string
  todayProb: number | null
  isHome: boolean | null      // is member's team the home team?
}

// One display row — may represent multiple members sharing the same game
interface GameRow {
  key: string
  gamePk: number | null
  gameStatus: string | null
  awayTeam: string | null
  homeTeam: string | null
  awayScore: number | null
  homeScore: number | null
  gameDate: string | null
  todayProb: number | null          // highest prob among members in this game
  members: TodayEntry[]             // all league members whose team is in this game
}

function gameTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    }).format(new Date(iso)) + ' ET'
  } catch {
    return '—'
  }
}

function sortKey(row: GameRow): number {
  const hit13 = row.awayScore === 13 || row.homeScore === 13
  if (hit13) return 0
  if (row.gameStatus === 'Live') return 1
  if (row.gameStatus === 'Preview') return 2 - (row.todayProb ?? 0)
  if (row.gameStatus === 'Final') return 3
  return 4
}

/** Collapse TodayEntry[] into one GameRow per unique game */
function buildGameRows(entries: TodayEntry[]): { playing: GameRow[]; offDay: GameRow[] } {
  const byGame = new Map<number | 'off', GameRow>()

  for (const entry of entries) {
    if (entry.gamePk === null || entry.gameStatus === null) {
      // Off-day — one row per member (no game to share)
      const key = `off-${entry.memberName}`
      byGame.set(key as unknown as number, {
        key,
        gamePk: null,
        gameStatus: null,
        awayTeam: null,
        homeTeam: null,
        awayScore: null,
        homeScore: null,
        gameDate: null,
        todayProb: null,
        members: [entry],
      })
      continue
    }

    const existing = byGame.get(entry.gamePk)
    if (existing) {
      existing.members.push(entry)
      if ((entry.todayProb ?? 0) > (existing.todayProb ?? 0)) {
        existing.todayProb = entry.todayProb
      }
    } else {
      byGame.set(entry.gamePk, {
        key: String(entry.gamePk),
        gamePk: entry.gamePk,
        gameStatus: entry.gameStatus,
        awayTeam: entry.awayTeam,
        homeTeam: entry.homeTeam,
        awayScore: entry.awayScore,
        homeScore: entry.homeScore,
        gameDate: entry.gameDate,
        todayProb: entry.todayProb,
        members: [entry],
      })
    }
  }

  const rows = Array.from(byGame.values())
  return {
    playing: rows.filter(r => r.gameStatus !== null).sort((a, b) => sortKey(a) - sortKey(b)),
    offDay:  rows.filter(r => r.gameStatus === null).sort((a, b) =>
      a.members[0].memberName.localeCompare(b.members[0].memberName)
    ),
  }
}

export default function TodayStrip({
  entries,
  slug,
}: {
  entries: TodayEntry[]
  slug?: string
}) {
  if (entries.length === 0) return null

  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date())

  const { playing, offDay } = buildGameRows(entries)
  const sorted = [...playing, ...offDay]

  const liveCount     = playing.filter(r => r.gameStatus === 'Live').length
  const thirteenToday = playing.filter(r => r.awayScore === 13 || r.homeScore === 13).length

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Today in the League</h2>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-400 text-xs font-mono font-bold">
                {liveCount} live
              </span>
            </span>
          )}
          {thirteenToday > 0 && (
            <span className="text-[#39ff14] text-xs font-mono font-bold">
              ⚡ {thirteenToday === 1 ? '13-run game!' : `${thirteenToday} thirteen-run games!`}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-600 font-mono">{today}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {sorted.map((row) => {
          const hit13     = row.awayScore === 13 || row.homeScore === 13
          const isFinal   = row.gameStatus === 'Final'
          const isLive    = row.gameStatus === 'Live'
          const isPreview = row.gameStatus === 'Preview'

          // Which teams in this game belong to league members?
          const leagueTeams = new Set(row.members.map(m => m.team.toUpperCase()))

          return (
            <div
              key={row.key}
              className={[
                'flex items-center gap-3 px-3 py-2 text-sm rounded border',
                hit13
                  ? 'bg-[#39ff14]/[0.04] border-[#39ff14]/20'
                  : 'bg-[#111] border-gray-900',
              ].join(' ')}
            >
              {/* Status indicator */}
              <div className="w-16 shrink-0">
                {isLive && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    <span className="text-green-400 font-bold text-xs font-mono">LIVE</span>
                  </span>
                )}
                {isFinal && (
                  <span className={`text-xs font-mono font-bold ${hit13 ? 'text-[#39ff14]' : 'text-gray-600'}`}>
                    {hit13 ? '⚡ FINAL' : 'FINAL'}
                  </span>
                )}
                {isPreview && row.gameDate && (
                  <span className="text-gray-600 text-xs font-mono">
                    {gameTime(row.gameDate)}
                  </span>
                )}
                {!row.gameStatus && (
                  <span className="text-gray-800 text-xs font-mono">OFF</span>
                )}
              </div>

              {/* Matchup — highlight league teams in white/green, opponents in gray */}
              <div className="flex items-center gap-1 flex-1 min-w-0 font-mono text-sm">
                {row.awayTeam ? (
                  <>
                    <span className={`font-black shrink-0 ${
                      leagueTeams.has(row.awayTeam)
                        ? (row.awayScore === 13 ? 'text-[#39ff14]' : 'text-white')
                        : 'text-gray-500'
                    }`}>
                      {row.awayTeam}
                    </span>
                    <span className="text-gray-700 shrink-0 text-xs">@</span>
                    <span className={`font-black shrink-0 ${
                      leagueTeams.has(row.homeTeam ?? '')
                        ? (row.homeScore === 13 ? 'text-[#39ff14]' : 'text-white')
                        : 'text-gray-500'
                    }`}>
                      {row.homeTeam}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-700 text-xs">—</span>
                )}
              </div>

              {/* Score or probability */}
              <div className="shrink-0 text-right min-w-[52px]">
                {(isFinal || isLive) && row.awayScore !== null && row.homeScore !== null ? (
                  <span className="font-mono text-sm">
                    <span className={`font-bold ${row.awayScore === 13 ? 'text-[#39ff14] text-base' : 'text-white'}`}>
                      {row.awayScore}
                    </span>
                    <span className="text-gray-700 mx-0.5">–</span>
                    <span className={`font-bold ${row.homeScore === 13 ? 'text-[#39ff14] text-base' : 'text-gray-400'}`}>
                      {row.homeScore}
                    </span>
                  </span>
                ) : isPreview && row.todayProb !== null ? (
                  <span className="text-gray-500 text-xs font-mono">
                    {(row.todayProb * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-800 text-xs">—</span>
                )}
              </div>

              {/* Member name(s) */}
              <div className="text-xs shrink-0 w-24 text-right font-mono">
                {row.members.map((m, i) => {
                  const memberHit13 = m.team.toUpperCase() === row.awayTeam
                    ? row.awayScore === 13
                    : row.homeScore === 13
                  return slug && m.memberId ? (
                    <div key={m.memberId}>
                      <Link
                        href={`/league/${slug}/player/${m.memberId}`}
                        className={`hover:text-[#39ff14] transition-colors truncate block ${
                          memberHit13 ? 'text-[#39ff14]' : i === 0 ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {m.memberName}
                      </Link>
                    </div>
                  ) : (
                    <div key={m.memberName} className={`truncate ${memberHit13 ? 'text-[#39ff14]' : i === 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                      {m.memberName}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
