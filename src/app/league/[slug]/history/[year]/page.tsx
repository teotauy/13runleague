import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeamColor, normalizeTeamAbbr } from '@/lib/teamColors'

export const dynamic = 'force-dynamic'

const SEASON_WEEKS = 28

interface WeekWin {
  memberName: string
  team: string
  payoutAmount: number | null
  gameDate: string | null // YYYY-MM-DD
}

interface GameScore {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  gameDate: string
}

function weekStart(year: number, week: number): Date {
  const d = new Date(year, 3, 1) // April 1 (month is 0-indexed)
  d.setDate(d.getDate() + (week - 1) * 7)
  return d
}

function formatWeekDate(d: Date): string {
  return d
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase()
}

function formatGameDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return d
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase()
}

interface Props {
  params: Promise<{ slug: string; year: string }>
}

export default async function HistoryYearPage({ params }: Props) {
  const { slug, year: yearStr } = await params
  const year = parseInt(yearStr, 10)

  if (isNaN(year)) notFound()

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    redirect(`/league/${slug}/join`)
  }

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  // ── Data fetching ──────────────────────────────────────────────────────────

  // 1. Historical results for this league + year
  const { data: histRows } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares, week_wins')
    .eq('league_id', league.id)
    .eq('year', year)

  // 2. Available years for nav
  const { data: yearRows } = await supabase
    .from('historical_results')
    .select('year')
    .eq('league_id', league.id)

  const availableYears = [...new Set((yearRows ?? []).map((r) => r.year))].sort(
    (a, b) => a - b
  )

  if (!histRows || histRows.length === 0) notFound()

  // 3. Members (to resolve payout member_id → name)
  const { data: memberRows } = await supabase
    .from('members')
    .select('id, name')
    .eq('league_id', league.id)

  const memberNameById = new Map<string, string>(
    (memberRows ?? []).map((m) => [m.id, m.name])
  )

  // 4. Payouts for this league + year
  const { data: payoutRows } = await supabase
    .from('payouts')
    .select('member_id, week_number, winning_team, payout_amount, game_date')
    .eq('league_id', league.id)
    .eq('year', year)

  // 5. Game results (was_thirteen=true) for this season date range
  const seasonStart = `${year}-04-01`
  const seasonEnd = `${year}-10-15`
  const { data: seasonGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, winning_team')
    .eq('was_thirteen', true)
    .gte('game_date', seasonStart)
    .lte('game_date', seasonEnd)

  // Count of MLB 13s this season
  const { count: mlbCount } = await supabase
    .from('game_results')
    .select('*', { count: 'exact', head: true })
    .eq('was_thirteen', true)
    .gte('game_date', seasonStart)
    .lte('game_date', seasonEnd)

  // ── Build week map ─────────────────────────────────────────────────────────

  const weekMap = new Map<number, WeekWin>()

  // First: populate from payouts (more precise)
  for (const p of payoutRows ?? []) {
    if (!p.week_number) continue
    const name =
      memberNameById.get(p.member_id) ?? p.member_id
    const team = normalizeTeamAbbr((p.winning_team ?? '').toUpperCase())
    weekMap.set(p.week_number, {
      memberName: name,
      team,
      payoutAmount: p.payout_amount ?? null,
      gameDate: p.game_date ?? null,
    })
  }

  // Then: fill any missing weeks from historical_results.week_wins[]
  for (const row of histRows) {
    const weekWins: number[] = Array.isArray(row.week_wins) ? row.week_wins : []
    const team = normalizeTeamAbbr((row.team ?? '').toUpperCase())
    for (const wk of weekWins) {
      if (!weekMap.has(wk)) {
        // Estimate per-week payout from season total ÷ shares (weeks won)
        const shares = row.shares ?? weekWins.length
        const perWeek = shares > 0 ? Math.round((row.total_won ?? 0) / shares) : null
        weekMap.set(wk, {
          memberName: row.member_name,
          team,
          payoutAmount: perWeek && perWeek > 0 ? perWeek : null,
          gameDate: null,
        })
      }
    }
  }

  // ── Game score matching (in memory) ───────────────────────────────────────

  const scoreMap = new Map<number, GameScore>()

  for (const [wk, win] of weekMap.entries()) {
    const team = win.team
    let found: GameScore | null = null

    // Helper: does this game match our team AND did our team score 13?
    const isTeamThirteen = (sg: typeof seasonGames extends (infer T)[] | null ? T : never) => {
      const home = normalizeTeamAbbr(sg.home_team.toUpperCase())
      const away = normalizeTeamAbbr(sg.away_team.toUpperCase())
      return (
        (home === team && sg.home_score === 13) ||
        (away === team && sg.away_score === 13)
      )
    }

    if (win.gameDate) {
      // Match by exact game date + team scored 13
      const g = (seasonGames ?? []).find(
        (sg) => sg.game_date === win.gameDate && isTeamThirteen(sg)
      )
      if (g) {
        found = {
          homeTeam: normalizeTeamAbbr(g.home_team.toUpperCase()),
          awayTeam: normalizeTeamAbbr(g.away_team.toUpperCase()),
          homeScore: g.home_score,
          awayScore: g.away_score,
          gameDate: g.game_date,
        }
      }
    } else {
      // Match by week window + team scored 13
      const ws = weekStart(year, wk)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      const wsStr = ws.toISOString().slice(0, 10)
      const weStr = we.toISOString().slice(0, 10)

      const g = (seasonGames ?? []).find(
        (sg) =>
          sg.game_date >= wsStr &&
          sg.game_date <= weStr &&
          isTeamThirteen(sg)
      )
      if (g) {
        found = {
          homeTeam: normalizeTeamAbbr(g.home_team.toUpperCase()),
          awayTeam: normalizeTeamAbbr(g.away_team.toUpperCase()),
          homeScore: g.home_score,
          awayScore: g.away_score,
          gameDate: g.game_date,
        }
      }
    }

    if (found) scoreMap.set(wk, found)
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  // Champion: most wins in weekMap
  const winsByMember = new Map<string, number>()
  for (const win of weekMap.values()) {
    winsByMember.set(win.memberName, (winsByMember.get(win.memberName) ?? 0) + 1)
  }
  let champion = ''
  let championWins = 0
  for (const [name, count] of winsByMember.entries()) {
    if (count > championWins) {
      champion = name
      championWins = count
    }
  }

  // Most earned: from histRows total_won
  const earnedByMember = new Map<string, number>()
  for (const row of histRows) {
    earnedByMember.set(
      row.member_name,
      (earnedByMember.get(row.member_name) ?? 0) + (row.total_won ?? 0)
    )
  }
  let mostEarned = ''
  let mostEarnedAmount = 0
  for (const [name, amt] of earnedByMember.entries()) {
    if (amt > mostEarnedAmount) {
      mostEarned = name
      mostEarnedAmount = amt
    }
  }

  // Biggest pot
  const biggestPot = Math.max(
    ...(payoutRows ?? []).map((p) => p.payout_amount ?? 0),
    0
  )

  // Hottest team
  const winsByTeam = new Map<string, number>()
  for (const win of weekMap.values()) {
    winsByTeam.set(win.team, (winsByTeam.get(win.team) ?? 0) + 1)
  }
  let hottestTeam = ''
  let hottestTeamCount = 0
  for (const [team, count] of winsByTeam.entries()) {
    if (count > hottestTeamCount) {
      hottestTeam = team
      hottestTeamCount = count
    }
  }

  // Longest streak
  let longestStreak = 0
  let longestStreakMember = ''
  let currentStreakMember = ''
  let currentStreakLen = 0
  for (let wk = 1; wk <= SEASON_WEEKS; wk++) {
    const win = weekMap.get(wk)
    if (win) {
      if (win.memberName === currentStreakMember) {
        currentStreakLen += 1
      } else {
        currentStreakMember = win.memberName
        currentStreakLen = 1
      }
      if (currentStreakLen > longestStreak) {
        longestStreak = currentStreakLen
        longestStreakMember = win.memberName
      }
    } else {
      currentStreakMember = ''
      currentStreakLen = 0
    }
  }

  // ── Score string helper ────────────────────────────────────────────────────

  function buildScoreStr(wk: number, team: string): string | null {
    const gs = scoreMap.get(wk)
    if (!gs) return null
    const isHome = gs.homeTeam === team
    const myScore = isHome ? gs.homeScore : gs.awayScore
    const oppScore = isHome ? gs.awayScore : gs.homeScore
    const oppTeam = isHome ? gs.awayTeam : gs.homeTeam
    return `${myScore}–${oppScore} ${oppTeam}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Year nav */}
        <div className="flex flex-wrap gap-2">
          {availableYears.map((y) => (
            <Link
              key={y}
              href={`/league/${slug}/history/${y}`}
              className={
                y === year
                  ? 'px-3 py-1 rounded-full text-sm font-bold bg-[#39ff14] text-black'
                  : 'px-3 py-1 rounded-full text-sm bg-[#1a1a1a] text-gray-400 border border-[#333] hover:text-white'
              }
            >
              {y}
            </Link>
          ))}
        </div>

        {/* Title block */}
        <div className="text-center border-t border-b border-[#222] py-5 space-y-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">{league.name}</p>
          <p className="text-5xl font-black text-[#39ff14]">{year}</p>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Season</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

          {champion && championWins > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🏆 Champion</p>
              <p className="font-bold text-white text-sm">{champion}</p>
              <p className="text-[#39ff14] text-xs">{championWins} wins</p>
            </div>
          )}

          {mostEarned && mostEarnedAmount > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💰 Most Earned</p>
              <p className="font-bold text-white text-sm">{mostEarned}</p>
              <p className="text-[#39ff14] text-xs">${mostEarnedAmount.toFixed(0)}</p>
            </div>
          )}

          {biggestPot > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">💸 Biggest Pot</p>
              <p className="font-black text-[#39ff14] text-xl">${biggestPot.toFixed(0)}</p>
            </div>
          )}

          {longestStreak > 1 && longestStreakMember && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">🔥 Hot Streak</p>
              <p className="font-bold text-white text-sm">{longestStreakMember}</p>
              <p className="text-[#39ff14] text-xs">{longestStreak} in a row</p>
            </div>
          )}

          {hottestTeam && hottestTeamCount > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚡ Hottest Team</p>
              <p className="font-bold text-white text-sm">{hottestTeam}</p>
              <p className="text-[#39ff14] text-xs">{hottestTeamCount}× this season</p>
            </div>
          )}

          {(mlbCount ?? 0) > 0 && (
            <div className="bg-[#111] rounded-lg p-3 border border-[#1e1e1e]">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">⚾ MLB 13s</p>
              <p className="font-bold text-white text-sm">{mlbCount}</p>
              <p className="text-[#39ff14] text-xs">games that season</p>
            </div>
          )}

        </div>

        {/* Week list */}
        <div className="space-y-0.5">
          {Array.from({ length: SEASON_WEEKS }, (_, i) => i + 1).map((wk) => {
            const win = weekMap.get(wk)
            const ws = weekStart(year, wk)
            const weekLabel = formatWeekDate(ws)
            const weekNumStr = String(wk).padStart(2, '0')

            if (!win) {
              return (
                <div
                  key={wk}
                  className="flex items-center gap-4 py-2 px-3 text-gray-700 hover:bg-[#0f0f0f] rounded"
                >
                  <span className="font-mono text-xs w-6 text-right">{weekNumStr}</span>
                  <span className="text-xs w-16 text-gray-600">{weekLabel}</span>
                  <span className="text-xs tracking-[0.2em] text-gray-700">· · · ROLLOVER · · ·</span>
                </div>
              )
            }

            const teamColors = getTeamColor(win.team)
            const displayDate = win.gameDate ? formatGameDate(win.gameDate) : weekLabel
            const scoreStr = buildScoreStr(wk, win.team)

            return (
              <div
                key={wk}
                className="flex items-center gap-3 py-2.5 px-3 hover:bg-[#0f0f0f] rounded border-l-2 border-[#39ff14]/20 hover:border-[#39ff14]/60"
              >
                <span className="font-mono text-xs w-6 text-right text-gray-500">{weekNumStr}</span>
                <span className="text-xs w-16 text-gray-500">{displayDate}</span>
                <span className="font-semibold text-white text-sm flex-1">{win.memberName}</span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: teamColors.primaryColor,
                    color: teamColors.textColor,
                  }}
                >
                  {win.team}
                </span>
                {scoreStr && (
                  <span className="text-gray-400 text-xs font-mono">{scoreStr}</span>
                )}
                {win.payoutAmount != null && (
                  <span className="text-[#39ff14] text-xs font-mono font-bold">
                    ${win.payoutAmount.toFixed(0)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Back link */}
        <div className="pt-4 border-t border-[#1a1a1a]">
          <Link
            href={`/league/${slug}`}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← {league.name}
          </Link>
        </div>

      </div>
    </main>
  )
}
