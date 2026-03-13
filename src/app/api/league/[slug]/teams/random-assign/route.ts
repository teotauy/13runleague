import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CWS', 'CLE', 'COL', 'DET', 'HOU',
  'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'ATH', 'PHI',
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

  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  try {
    // Get all members in this league
    const { data: members } = await supabase
      .from('members')
      .select('id, assigned_team')
      .eq('league_id', league.id)

    if (!members) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 })
    }

    // Find unassigned members and already assigned teams
    const unassignedMembers = members.filter((m) => !m.assigned_team)
    const assignedTeams = new Set(members.filter((m) => m.assigned_team).map((m) => m.assigned_team))

    // Get available teams
    const availableTeams = shuffle(MLB_TEAMS.filter((t) => !assignedTeams.has(t)))

    // Assign available teams to unassigned members
    const assignments: Record<string, string> = {}
    for (let i = 0; i < unassignedMembers.length && i < availableTeams.length; i++) {
      assignments[unassignedMembers[i].id] = availableTeams[i]

      // Update database
      await supabase
        .from('members')
        .update({ assigned_team: availableTeams[i] })
        .eq('id', unassignedMembers[i].id)
    }

    // Return full current state of all member assignments
    const { data: updatedMembers } = await supabase
      .from('members')
      .select('id, assigned_team')
      .eq('league_id', league.id)

    const fullAssignments = updatedMembers?.reduce(
      (acc, m) => ({
        ...acc,
        [m.id]: m.assigned_team,
      }),
      {}
    ) || {}

    return NextResponse.json({
      success: true,
      assignments: fullAssignments,
      randomlyAssigned: assignments,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to randomize assignments' }, { status: 500 })
  }
}
