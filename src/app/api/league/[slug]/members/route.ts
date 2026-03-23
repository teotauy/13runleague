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

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const body = await req.json()

  try {
    // Guard: reject if a member with this name already exists in this league
    const { data: duplicate } = await supabase
      .from('members')
      .select('id, name')
      .eq('league_id', league.id)
      .ilike('name', (body.name ?? '').trim())
      .maybeSingle()

    if (duplicate) {
      return NextResponse.json(
        {
          error: `"${duplicate.name}" already exists in this league.`,
          details: `To add a second person with the same name, use a nickname or middle initial — e.g. "Chris W." or "Chris Williams Jr."`,
        },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        league_id: league.id,
        name: body.name,
        assigned_team: body.assigned_team ?? '',
        phone: body.phone,
        email: body.email,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    // Supabase PostgrestError has .message but may not be instanceof Error
    const anyErr = err as { message?: string; details?: string; hint?: string; code?: string }
    const message = anyErr?.message ?? String(err)
    console.error('Member create error:', err)
    return NextResponse.json({ error: message, details: anyErr?.details, hint: anyErr?.hint, code: anyErr?.code }, { status: 500 })
  }
}
