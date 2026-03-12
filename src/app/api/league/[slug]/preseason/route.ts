import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const body = await req.json()
  const { memberId, returning: returningVal, paid } = body as {
    memberId: string
    returning?: 'yes' | 'no' | 'maybe' | null
    paid?: boolean
  }

  if (!memberId) {
    return NextResponse.json({ error: 'memberId required' }, { status: 400 })
  }

  // Verify member belongs to this league
  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('id', memberId)
    .eq('league_id', league.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (returningVal !== undefined) updates.pre_season_returning = returningVal ?? null
  if (paid !== undefined) updates.pre_season_paid = paid

  const { error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', memberId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
