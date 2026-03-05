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
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
