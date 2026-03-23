import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = await req.json()

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
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'No active draft' }, { status: 400 })
    }

    // Get current pick count to determine pick order
    const { data: existingPicks } = await supabase
      .from('draft_picks')
      .select('id')
      .eq('draft_session_id', draft.id)

    const pickOrder = (existingPicks?.length ?? 0) + 1

    // Resolve which member is picking:
    // - If body.member_id is provided (double-blind draw), use that specific member
    // - Otherwise fall back to first unpicked member (legacy / random-assign flow)
    let targetMemberId: string

    if (body.member_id) {
      targetMemberId = body.member_id
    } else {
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('league_id', league.id)

      const { data: picks } = await supabase
        .from('draft_picks')
        .select('member_id')
        .eq('draft_session_id', draft.id)

      const pickedMemberIds = new Set(picks?.map((p) => p.member_id) ?? [])
      const unpickedMember = members?.find((m) => !pickedMemberIds.has(m.id))

      if (!unpickedMember) {
        return NextResponse.json({ error: 'All teams already picked' }, { status: 400 })
      }
      targetMemberId = unpickedMember.id
    }

    // Create draft pick
    const { data: newPick, error } = await supabase
      .from('draft_picks')
      .insert({
        draft_session_id: draft.id,
        member_id: targetMemberId,
        team_abbr: body.team_abbr,
        pick_order: pickOrder,
      })
      .select()
      .single()

    if (error) throw error

    // Update member's assigned team
    await supabase
      .from('members')
      .update({ assigned_team: body.team_abbr })
      .eq('id', targetMemberId)

    return NextResponse.json(newPick, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to pick team' }, { status: 500 })
  }
}
