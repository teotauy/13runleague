import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DraftRoom from '@/components/draft/DraftRoom'
import { TEAM_COLORS, normalizeTeamAbbr } from '@/lib/teamColors'
import type { TeamStat } from '@/components/draft/DraftRankingsBoard'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DraftPage({ params }: Props) {
  const { slug } = await params

  // Auth check - defense in depth (middleware will redirect, but check here too)
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!authCookie) {
    notFound()
  }

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !league) notFound()

  const { data: members } = await supabase
    .from('members')
    .select('id, name, assigned_team')
    .eq('league_id', league.id)
    .order('name')

  const { data: activeDraft } = await supabase
    .from('draft_sessions')
    .select('id, draft_mode, draft_status')
    .eq('league_id', league.id)
    .neq('draft_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: draftPicks } = await supabase
    .from('draft_picks')
    .select('id, member_id, team_abbr, pick_order')
    .eq('draft_session_id', activeDraft?.id || '')
    .order('pick_order', { ascending: true })

  // ── Team rankings data ──────────────────────────────────────────────────────

  // League history: per-team wins + earnings from this league's historical data
  const { data: leagueHistory } = await supabase
    .from('historical_results')
    .select('team, shares, total_won')
    .eq('league_id', league.id)

  // MLB all-time 13-run game counts (Retrosheet) — normalize OAK→ATH etc.
  const { data: mlbCounts } = await supabase
    .from('game_results')
    .select('winning_team')
    .eq('was_thirteen', true)
    .not('winning_team', 'is', null)

  // Aggregate league stats per team
  const leagueMap = new Map<string, { wins: number; earned: number; seasons: number }>()
  for (const row of leagueHistory ?? []) {
    const abbr = normalizeTeamAbbr(row.team)
    const cur = leagueMap.get(abbr) ?? { wins: 0, earned: 0, seasons: 0 }
    cur.wins    += row.shares ?? 0
    cur.earned  += row.total_won ?? 0
    cur.seasons += 1
    leagueMap.set(abbr, cur)
  }

  // Aggregate MLB all-time counts per team
  const mlbMap = new Map<string, number>()
  for (const row of mlbCounts ?? []) {
    if (!row.winning_team) continue
    const abbr = normalizeTeamAbbr(row.winning_team)
    mlbMap.set(abbr, (mlbMap.get(abbr) ?? 0) + 1)
  }

  // Build final TeamStat[] for all 30 teams
  const teamStats: TeamStat[] = Object.keys(TEAM_COLORS).map(abbr => {
    const lg = leagueMap.get(abbr)
    return {
      abbr,
      leagueWins:   lg?.wins    ?? 0,
      totalEarned:  lg?.earned  ?? 0,
      seasons:      lg?.seasons ?? 0,
      mlbHistory:   mlbMap.get(abbr) ?? 0,
    }
  })

  return (
    <main className="min-h-screen bg-[#0f1115] stadium-texture text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black">
                <span className="text-[#39ff14]">Draft</span> Room
              </h1>
              <p className="text-gray-400 text-lg mt-1">{league.name}</p>
            </div>
            <a href={`/league/${slug}/admin`} className="text-gray-400 text-sm hover:text-gray-400">
              ← Back to Admin
            </a>
          </div>
        </header>

        {/* Draft Room */}
        <DraftRoom
          leagueId={league.id}
          leagueSlug={slug}
          members={members ?? []}
          activeDraft={activeDraft}
          draftPicks={draftPicks ?? []}
          teamStats={teamStats}
        />
      </div>
    </main>
  )
}
