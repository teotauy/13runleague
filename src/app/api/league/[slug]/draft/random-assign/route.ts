import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CLE', 'COL', 'DET', 'HOU',
  'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK', 'PHI',
  'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  try {
    // Get active draft
    const { data: draft } = await supabase
      .from('draft_sessions')
      .select('id')
      .eq('league_id', league.id)
      .eq('draft_status', 'in_progress')
      .limit(1)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'No active draft' }, { status: 400 })
    }

    // Get all members
    const { data: members } = await supabase
      .from('members')
      .select('id')
      .eq('league_id', league.id)

    if (!members) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 })
    }

    // Shuffle teams
    const shuffledTeams = shuffle(MLB_TEAMS)

    // Create draft picks
    const picks = members.map((member, idx) => ({
      draft_session_id: draft.id,
      member_id: member.id,
      team_abbr: shuffledTeams[idx],
      pick_order: idx + 1,
    }))

    const { error: pickError } = await supabase.from('draft_picks').insert(picks)

    if (pickError) throw pickError

    // Update members with assigned teams
    for (const pick of picks) {
      await supabase
        .from('members')
        .update({ assigned_team: pick.team_abbr })
        .eq('id', pick.member_id)
    }

    return NextResponse.json({
      success: true,
      picks_created: picks.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to randomize draft' }, { status: 500 })
  }
}
