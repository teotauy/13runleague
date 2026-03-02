import { createClient } from '@/lib/supabase/server'
import { fetchTeamGameLog, currentSeason } from '@/lib/mlb'

interface Props {
  params: Promise<{ away: string; home: string }>
}

export default async function MatchupPage({ params }: Props) {
  const { away, home } = await params
  const awayAbbr = away.toUpperCase()
  const homeAbbr = home.toUpperCase()
  const season = currentSeason()

  const supabase = await createClient()

  // Historical 13-run games between these teams
  const { data: thirteenGames } = await supabase
    .from('game_results')
    .select('*')
    .eq('was_thirteen', true)
    .or(
      `and(away_team.eq.${awayAbbr},home_team.eq.${homeAbbr}),and(away_team.eq.${homeAbbr},home_team.eq.${awayAbbr})`
    )
    .order('game_date', { ascending: false })

  // All games between these teams this season
  const { data: allMatchupGames } = await supabase
    .from('game_results')
    .select('away_team, home_team, away_score, home_score, game_date')
    .or(
      `and(away_team.eq.${awayAbbr},home_team.eq.${homeAbbr}),and(away_team.eq.${homeAbbr},home_team.eq.${awayAbbr})`
    )
    .eq('final', true)
    .order('game_date', { ascending: false })
    .limit(100)

  // Run distribution from game logs
  const [awayLog, homeLog] = await Promise.all([
    fetchTeamGameLog(0, season), // placeholder — teams fetched by abbr via schedule
    fetchTeamGameLog(0, season),
  ])

  // Build run distribution from DB matchup history
  const awayCounts: Record<number, number> = {}
  const homeCounts: Record<number, number> = {}
  let awayTotal = 0
  let homeTotal = 0
  let gameCount = 0

  for (const game of allMatchupGames ?? []) {
    const awayRuns = game.away_team === awayAbbr ? game.away_score : game.home_score
    const homeRuns = game.home_team === homeAbbr ? game.home_score : game.away_score
    if (awayRuns !== null) {
      awayCounts[awayRuns] = (awayCounts[awayRuns] ?? 0) + 1
      awayTotal += awayRuns
      gameCount++
    }
    if (homeRuns !== null) {
      homeCounts[homeRuns] = (homeCounts[homeRuns] ?? 0) + 1
      homeTotal += homeRuns
    }
  }

  const awayAvg = gameCount > 0 ? (awayTotal / gameCount).toFixed(2) : '—'
  const homeAvg = gameCount > 0 ? (homeTotal / gameCount).toFixed(2) : '—'
  const thirteenCount = thirteenGames?.length ?? 0

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <header>
          <a href="/" className="text-gray-600 text-sm hover:text-gray-400 mb-4 inline-block">← Dashboard</a>
          <h1 className="text-4xl font-black">
            <span className="text-[#39ff14]">{awayAbbr}</span>{' '}
            <span className="text-gray-500">@</span>{' '}
            <span className="text-[#39ff14]">{homeAbbr}</span>
          </h1>
          <p className="text-gray-500 mt-1">Head-to-head 13-run analysis</p>
        </header>

        {/* Storyline card */}
        <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-5">
          <div className="text-amber-400 font-bold text-lg mb-2">📖 Storyline</div>
          {thirteenCount > 0 ? (
            <p className="text-white">
              {awayAbbr} or {homeAbbr} have scored exactly 13 runs in{' '}
              <span className="text-[#39ff14] font-bold">{thirteenCount}</span>{' '}
              matchup{thirteenCount !== 1 ? 's' : ''} in our database.
            </p>
          ) : (
            <p className="text-gray-400">
              No team has scored exactly 13 runs in a recorded {awayAbbr} vs {homeAbbr} matchup yet.
              Could today be the day?
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Matchups tracked" value={String(gameCount)} />
          <StatCard label="13-run games" value={String(thirteenCount)} highlight={thirteenCount > 0} />
          <StatCard label={`${awayAbbr} avg runs`} value={awayAvg} />
          <StatCard label={`${homeAbbr} avg runs`} value={homeAvg} />
        </div>

        {/* Run distribution histograms */}
        {gameCount > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">Run Distribution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Histogram label={`${awayAbbr} runs scored`} counts={awayCounts} total={gameCount} />
              <Histogram label={`${homeAbbr} runs scored`} counts={homeCounts} total={gameCount} />
            </div>
          </section>
        )}

        {/* 13-run game history */}
        {thirteenCount > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">13-Run Games in this Matchup</h2>
            <div className="space-y-2">
              {thirteenGames!.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 text-sm rounded bg-[#111] border border-gray-900 px-4 py-2 font-mono"
                >
                  <span className="text-[#39ff14] font-bold">13</span>
                  <span className="text-gray-400">{g.game_date}</span>
                  <span className="text-white">
                    {g.away_team} @ {g.home_team} — {g.away_score}–{g.home_score}
                  </span>
                  <span className="ml-auto text-amber-400">{g.winning_team} scored 13</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-gray-900 pt-6 text-gray-700 text-xs">
          <p>
            The information used here was obtained free of charge from and is copyrighted by Retrosheet.
            Interested parties may contact Retrosheet at 20 Sunset Rd., Newark, DE 19711.
          </p>
        </footer>
      </div>
    </main>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded bg-[#111] border border-gray-900 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${highlight ? 'text-[#39ff14]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

function Histogram({
  label,
  counts,
  total,
}: {
  label: string
  counts: Record<number, number>
  total: number
}) {
  const maxCount = Math.max(...Object.values(counts), 1)

  return (
    <div>
      <div className="text-sm text-gray-400 mb-3">{label}</div>
      <div className="space-y-1">
        {Array.from({ length: 17 }, (_, i) => {
          const count = counts[i] ?? 0
          const pct = (count / maxCount) * 100
          const is13 = i === 13
          return (
            <div key={i} className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-5 text-right ${is13 ? 'text-[#39ff14] font-bold' : 'text-gray-600'}`}>
                {i}
              </span>
              <div className="flex-1 bg-gray-900 rounded-sm h-4 overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: is13 ? '#39ff14' : '#374151',
                  }}
                />
              </div>
              <span className="w-6 text-gray-600">{count || ''}</span>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-700 mt-2">{total} games in database</div>
    </div>
  )
}
