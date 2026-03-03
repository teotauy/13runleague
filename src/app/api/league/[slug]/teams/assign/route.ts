import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await req.json()
  const assignments = body.assignments // { memberId: teamAbbr }

  try {
    // Update all members with their assigned teams
    for (const [memberId, teamAbbr] of Object.entries(assignments)) {
      if (teamAbbr) {
        await supabase
          .from('members')
          .update({ assigned_team: teamAbbr })
          .eq('id', memberId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to assign teams' }, { status: 500 })
  }
}
