import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import WeeklyRecap from '../../../../../../emails/WeeklyRecap'
import { getWeekNumber } from '@/lib/pot'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

async function buildRecapData(slug: string) {
  const supabase = createServiceClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, pot_total, weekly_buy_in')
    .eq('slug', slug)
    .single()

  if (!league) return null

  // Active members with emails
  const { data: members } = await supabase
    .from('members')
    .select('name, email, is_active')
    .eq('league_id', league.id)
    .neq('is_active', false)

  const emails = (members ?? [])
    .flatMap((m) =>
      m.email
        ? m.email.split(',').map((e: string) => e.trim()).filter(Boolean)
        : []
    )
    .filter((e): e is string => !!e)

  // Active member count × weekly buy-in = this week's pot
  const activeMemberCount = (members ?? []).length
  const weeklyPot = (league.weekly_buy_in ?? 10) * activeMemberCount

  const weekNumber = getWeekNumber(new Date())

  const props = {
    weekNumber,
    upcomingGames: [],
    leagues: [{
      leagueName: league.name,
      potTotal: (league.pot_total ?? 0) + weeklyPot,
      weeklyBuyIn: league.weekly_buy_in ?? 10,
    }],
  }

  return { league, emails, props, weekNumber }
}

// GET — return preview HTML (no email sent)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  if (!isAdmin(cookieStore.get(`league_auth_${slug}`)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await buildRecapData(slug)
  if (!data) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const html = await render(WeeklyRecap(data.props))
  return NextResponse.json({ html, weekNumber: data.weekNumber, recipientCount: data.emails.length })
}

// POST — send the email (only callable by the admin UI after previewing)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const cookieStore = await cookies()
  if (!isAdmin(cookieStore.get(`league_auth_${slug}`)?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await buildRecapData(slug)
  if (!data) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  if (data.emails.length === 0) {
    return NextResponse.json({ error: 'No recipient emails found' }, { status: 400 })
  }

  const html = await render(WeeklyRecap(data.props))
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: '13 Run League <recap@13runleague.com>',
    to: data.emails,
    subject: `13 Run League — Week ${data.weekNumber} Recap`,
    html,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: data.emails.length, weekNumber: data.weekNumber })
}
