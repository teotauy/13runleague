import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeTeamAbbr } from '@/lib/teamColors'

const SEASON_WEEKS = 28

interface WeekWin {
  memberName: string
  team: string
  payoutAmount: number | null
  gameDate: string | null
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; year: string }> }
) {
  const { slug, year: yearStr } = await params
  const year = parseInt(yearStr, 10)

  if (isNaN(year)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // 1. Historical results for this league + year
  const { data: histRows } = await supabase
    .from('historical_results')
    .select('member_name, team, year, total_won, shares, week_wins')
    .eq('league_id', league.id)
    .eq('year', year)

  // 2. Payouts for this league + year
  const { data: payoutRows } = await supabase
    .from('payouts')
    .select('member_id, week_number, winning_team, payout_amount, game_date')
    .eq('league_id', league.id)
    .eq('year', year)

  // 3. Members for name lookup
  const memberIds = [...new Set((payoutRows ?? []).map((p) => p.member_id).filter(Boolean))]
  const { data: memberRows } = memberIds.length > 0
    ? await supabase
        .from('members')
        .select('id, name')
        .in('id', memberIds)
    : { data: [] }

  const memberNameById = new Map<string, string>(
    (memberRows ?? []).map((m) => [m.id, m.name])
  )

  // 4. Game results (was_thirteen=true) for this season date range
  const seasonStart = `${year}-04-01`
  const seasonEnd = `${year}-10-15`

  const { data: seasonGames } = await supabase
    .from('game_results')
    .select('game_date, home_team, away_team, home_score, away_score, winning_team')
    .eq('was_thirteen', true)
    .gte('game_date', seasonStart)
    .lte('game_date', seasonEnd)

  // 5. Count of MLB 13s this season
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
    const name = memberNameById.get(p.member_id) ?? p.member_id
    const team = normalizeTeamAbbr((p.winning_team ?? '').toUpperCase())
    weekMap.set(p.week_number, {
      memberName: name,
      team,
      payoutAmount: p.payout_amount ?? null,
      gameDate: p.game_date ?? null,
    })
  }

  // Then: fill any missing weeks from historical_results.week_wins[]
  for (const row of histRows ?? []) {
    const weekWins: number[] = Array.isArray(row.week_wins) ? row.week_wins : []
    const team = normalizeTeamAbbr((row.team ?? '').toUpperCase())
    for (const wk of weekWins) {
      if (!weekMap.has(wk)) {
        weekMap.set(wk, {
          memberName: row.member_name,
          team,
          payoutAmount:
            (row.shares ?? 0) > 0 ? (row.total_won ?? null) : null,
          gameDate: null,
        })
      }
    }
  }

  // ── Game score matching (in memory) ───────────────────────────────────────

  interface GameScore {
    homeTeam: string
    awayTeam: string
    homeScore: number
    awayScore: number
    gameDate: string
  }

  const scoreMap = new Map<number, GameScore>()

  for (const [wk, win] of weekMap.entries()) {
    const team = win.team
    let found: GameScore | null = null

    if (win.gameDate) {
      const g = (seasonGames ?? []).find(
        (sg) =>
          sg.game_date === win.gameDate &&
          (normalizeTeamAbbr(sg.home_team.toUpperCase()) === team ||
            normalizeTeamAbbr(sg.away_team.toUpperCase()) === team)
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
      const ws = weekStart(year, wk)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      const wsStr = ws.toISOString().slice(0, 10)
      const weStr = we.toISOString().slice(0, 10)

      const g = (seasonGames ?? []).find(
        (sg) =>
          sg.game_date >= wsStr &&
          sg.game_date <= weStr &&
          (normalizeTeamAbbr(sg.home_team.toUpperCase()) === team ||
            normalizeTeamAbbr(sg.away_team.toUpperCase()) === team)
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

  // ── Stats ──────────────────────────────────────────────────────────────────

  // Champion: most wins in weekMap
  const winsByMember = new Map<string, number>()
  for (const win of weekMap.values()) {
    winsByMember.set(win.memberName, (winsByMember.get(win.memberName) ?? 0) + 1)
  }
  let champion: string | null = null
  let championWins = 0
  for (const [name, count] of winsByMember.entries()) {
    if (count > championWins) {
      champion = name
      championWins = count
    }
  }

  // Most earned: from histRows total_won
  const earnedByMember = new Map<string, number>()
  for (const row of histRows ?? []) {
    earnedByMember.set(
      row.member_name,
      (earnedByMember.get(row.member_name) ?? 0) + (row.total_won ?? 0)
    )
  }
  let mostEarned: string | null = null
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
  let hottestTeam: string | null = null
  let hottestTeamCount = 0
  for (const [team, count] of winsByTeam.entries()) {
    if (count > hottestTeamCount) {
      hottestTeam = team
      hottestTeamCount = count
    }
  }

  // Longest streak
  let longestStreak = 0
  let longestStreakMember: string | null = null
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

  // ── Build weeks array ─────────────────────────────────────────────────────

  const weeks = Array.from({ length: SEASON_WEEKS }, (_, i) => {
    const wk = i + 1
    const win = weekMap.get(wk)
    const ws = weekStart(year, wk)

    if (!win) {
      return {
        weekNum: wk,
        dateStr: formatWeekDate(ws),
        memberName: null,
        team: null,
        scoreStr: null,
        payoutAmount: null,
      }
    }

    const displayDate = win.gameDate ? formatGameDate(win.gameDate) : formatWeekDate(ws)
    const scoreStr = buildScoreStr(wk, win.team)

    return {
      weekNum: wk,
      dateStr: displayDate,
      memberName: win.memberName,
      team: win.team,
      scoreStr,
      payoutAmount: win.payoutAmount,
    }
  })

  return NextResponse.json({
    weeks,
    stats: {
      champion,
      championWins,
      mostEarned,
      mostEarnedAmount,
      biggestPot,
      hottestTeam,
      hottestTeamCount,
      longestStreak,
      longestStreakMember,
      mlbCount: mlbCount ?? 0,
      hasData: weekMap.size > 0,
    },
  })
}
