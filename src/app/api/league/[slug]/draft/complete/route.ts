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

    // Mark draft as completed
    const { data, error } = await supabase
      .from('draft_sessions')
      .update({
        draft_status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', draft.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to complete draft' }, { status: 500 })
  }
}
