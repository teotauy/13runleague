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

function sortKey(e: TodayEntry): number {
  const hit13 = e.awayScore === 13 || e.homeScore === 13
  if (hit13) return 0
  if (e.gameStatus === 'Live') return 1
  // Preview: sort by probability descending (2.0 – prob puts high-prob games first)
  if (e.gameStatus === 'Preview') return 2 - (e.todayProb ?? 0)
  if (e.gameStatus === 'Final') return 3
  return 4  // no game
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

  const playing = entries.filter(e => e.gameStatus !== null)
  const offDay  = entries.filter(e => e.gameStatus === null)

  const sorted = [
    ...playing.sort((a, b) => sortKey(a) - sortKey(b)),
    ...offDay.sort((a, b) => a.memberName.localeCompare(b.memberName)),
  ]

  const liveCount    = playing.filter(e => e.gameStatus === 'Live').length
  // Count unique games (by gamePk) that had a 13-run score — not member entries,
  // so a game where two league members both have teams doesn't inflate the count.
  const thirteenToday = new Set(
    playing
      .filter(e => (e.awayScore === 13 || e.homeScore === 13) && e.gamePk !== null)
      .map(e => e.gamePk)
  ).size

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
        {sorted.map((entry) => {
          const hit13     = entry.awayScore === 13 || entry.homeScore === 13
          const isFinal   = entry.gameStatus === 'Final'
          const isLive    = entry.gameStatus === 'Live'
          const isPreview = entry.gameStatus === 'Preview'
          const opp       = entry.isHome ? entry.awayTeam : entry.homeTeam
          const myScore   = entry.isHome ? entry.homeScore : entry.awayScore
          const oppScore  = entry.isHome ? entry.awayScore : entry.homeScore
          const myHit13   = myScore === 13
          const oppHit13  = oppScore === 13
          // Other league members in the same game
          const teammates = entry.gamePk
            ? sorted.filter(e => e.gamePk === entry.gamePk && e.memberName !== entry.memberName)
            : []

          const nameEl = slug && entry.memberId ? (
            <Link
              href={`/league/${slug}/player/${entry.memberId}`}
              className={`hover:text-[#39ff14] transition-colors ${hit13 ? 'text-[#39ff14]' : 'text-gray-400'}`}
            >
              {entry.memberName}
            </Link>
          ) : (
            <span className={hit13 ? 'text-[#39ff14]' : 'text-gray-400'}>
              {entry.memberName}
            </span>
          )

          return (
            <div
              key={entry.memberName}
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
                {isPreview && entry.gameDate && (
                  <span className="text-gray-600 text-xs font-mono">
                    {gameTime(entry.gameDate)}
                  </span>
                )}
                {!entry.gameStatus && (
                  <span className="text-gray-800 text-xs font-mono">OFF</span>
                )}
              </div>

              {/* Team + opponent */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className={`font-black font-mono text-sm shrink-0 ${hit13 ? 'text-[#39ff14]' : 'text-white'}`}>
                  {entry.team.toUpperCase()}
                </span>
                {opp && (
                  <span className="text-gray-600 text-xs font-mono shrink-0">
                    {entry.isHome ? 'vs' : '@'} {opp}
                  </span>
                )}
              </div>

              {/* Score or probability */}
              <div className="shrink-0 text-right min-w-[60px]">
                {(isFinal || isLive) && myScore !== null && oppScore !== null ? (
                  <span className="font-mono text-sm">
                    <span className={`font-bold ${myHit13 ? 'text-[#39ff14] text-base' : 'text-white'}`}>
                      {myScore}
                    </span>
                    <span className="text-gray-700 mx-0.5">–</span>
                    <span className={`${oppHit13 ? 'text-[#39ff14] font-bold text-base' : 'text-gray-400'}`}>
                      {oppScore}
                    </span>
                  </span>
                ) : isPreview && entry.todayProb !== null ? (
                  <span className="text-gray-500 text-xs font-mono">
                    {(entry.todayProb * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-800 text-xs">—</span>
                )}
              </div>

              {/* Member name — links to player page if slug+memberId available */}
              <div className="text-xs shrink-0 w-24 text-right truncate font-mono">
                {nameEl}
                {teammates.length > 0 && (
                  <div className="text-gray-700 text-[10px] truncate">
                    also: {teammates.map(t => t.memberName.split(' ')[0]).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
