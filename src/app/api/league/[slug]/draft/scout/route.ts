import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { normalizeTeamAbbr, franchiseAbbrs, TEAM_COLORS } from '@/lib/teamColors'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { team_abbr } = body

  if (!team_abbr || typeof team_abbr !== 'string') {
    return NextResponse.json({ error: 'team_abbr required' }, { status: 400 })
  }

  const abbr = team_abbr.toUpperCase()
  const teamInfo = TEAM_COLORS[abbr]
  if (!teamInfo) {
    return NextResponse.json({ error: 'Unknown team' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // ── 1. League history for this franchise ─────────────────────────────────
  const franchiseList = franchiseAbbrs(abbr)

  const { data: leagueHistory } = await supabase
    .from('historical_results')
    .select('team, year, shares, total_won')
    .eq('league_id', league.id)
    .in('team', franchiseList)
    .order('year', { ascending: false })

  // ── 2. MLB all-time 13-run counts for this franchise ─────────────────────
  const { data: mlbGames } = await supabase
    .from('game_results')
    .select('game_date')
    .eq('was_thirteen', true)
    .in('winning_team', franchiseList)
    .order('game_date', { ascending: false })

  // ── 3. Build stats for prompt ─────────────────────────────────────────────
  const totalLeagueWins = leagueHistory?.reduce((sum, r) => sum + (r.shares ?? 0), 0) ?? 0
  const totalEarned = leagueHistory?.reduce((sum, r) => sum + (r.total_won ?? 0), 0) ?? 0
  const seasons = new Set(leagueHistory?.map(r => r.year) ?? []).size
  const mlbCount = mlbGames?.length ?? 0

  // Previous season (most recent year in history)
  const mostRecentYear = leagueHistory?.[0]?.year
  const prevSeason = mostRecentYear
    ? leagueHistory!.filter(r => r.year === mostRecentYear)
    : []
  const prevSeasonWins = prevSeason.reduce((sum, r) => sum + (r.shares ?? 0), 0)
  const prevSeasonEarned = prevSeason.reduce((sum, r) => sum + (r.total_won ?? 0), 0)

  // Win rate
  const winRate = seasons > 0 ? (totalLeagueWins / seasons).toFixed(2) : '0.00'

  // Build year-by-year summary (last 5 years)
  const yearMap = new Map<number, { wins: number; earned: number }>()
  for (const r of leagueHistory ?? []) {
    const cur = yearMap.get(r.year) ?? { wins: 0, earned: 0 }
    cur.wins += r.shares ?? 0
    cur.earned += r.total_won ?? 0
    yearMap.set(r.year, cur)
  }
  const recentYears = [...yearMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([year, s]) => `${year}: ${s.wins} wins, $${s.earned}`)
    .join(' | ')

  // ── 4. Build prompt ───────────────────────────────────────────────────────
  const leagueName = league.name

  const prompt = seasons === 0
    ? `You are a baseball scout giving a 1-2 sentence scouting report for a 13-run pool draft.

The team just drawn is the ${teamInfo.name} (${abbr}).

This franchise has NEVER appeared in the ${leagueName} draft before — they are a completely unknown quantity in this league.

MLB all-time 13-run games: ${mlbCount} games.

Write a punchy, fun 1-2 sentence scouting report about this team's potential for the draft. Focus on their MLB franchise history for scoring 13 runs. Be opinionated and specific. Do not use bullet points. Do not use markdown.`
    : `You are a baseball scout giving a 1-2 sentence scouting report for a 13-run pool draft.

The team just drawn is the ${teamInfo.name} (${abbr}).

League history in ${leagueName}:
- Seasons in league: ${seasons}
- Total 13-run wins: ${totalLeagueWins}
- Win rate: ${winRate} wins/season
- Total earned: $${totalEarned}
${mostRecentYear ? `- Last season (${mostRecentYear}): ${prevSeasonWins} wins, $${prevSeasonEarned}` : ''}
${recentYears ? `- Recent years: ${recentYears}` : ''}

MLB all-time 13-run games (Retrosheet, all franchise history): ${mlbCount} games.

Write a punchy, fun 1-2 sentence scouting report about this team for the draft. Be opinionated — are they a good pick or a risky one? Reference specific stats when relevant (wins, earnings, win rate, MLB history). Do not use bullet points. Do not use markdown. Be concise.`

  // ── 5. Call Claude ────────────────────────────────────────────────────────
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 256,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    return NextResponse.json({ report: text })
  } catch (err) {
    console.error('Scout report error:', err)
    return NextResponse.json({ error: 'Failed to generate scouting report' }, { status: 500 })
  }
}
