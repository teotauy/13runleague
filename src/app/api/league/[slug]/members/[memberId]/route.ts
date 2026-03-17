import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const { slug, memberId } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const body = await req.json()

  try {
    // Fetch current member to detect name changes
    const { data: current, error: fetchError } = await supabase
      .from('members')
      .select('name, league_id')
      .eq('id', memberId)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const nameChanged = body.name && body.name.trim() !== current.name

    if (nameChanged) {
      // Atomic rename — updates members + historical_results in one transaction
      const { error: renameError } = await supabase.rpc('rename_member', {
        p_member_id: memberId,
        p_old_name: current.name,
        p_new_name: body.name.trim(),
        p_league_id: current.league_id,
      })
      if (renameError) throw renameError
    }

    // Update non-name fields (team, phone, email, is_active) separately
    const { data, error } = await supabase
      .from('members')
      .update({
        ...(nameChanged ? {} : body.name !== undefined ? { name: body.name } : {}),
        ...(body.assigned_team !== undefined ? { assigned_team: body.assigned_team } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(typeof body.is_active === 'boolean' ? { is_active: body.is_active } : {}),
      })
      .eq('id', memberId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Member update error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  const { slug, memberId } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    const { error } = await supabase.from('members').delete().eq('id', memberId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
