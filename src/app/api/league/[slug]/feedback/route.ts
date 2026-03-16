import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('feedback')
      .select('id, message, page_url, member_name, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ feedback: data ?? [] })
  } catch (err) {
    console.error('Feedback fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
