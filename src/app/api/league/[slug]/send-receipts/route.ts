import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function buildReceiptHtml({
  memberName,
  teamName,
  teamAbbr,
  paymentMethod,
  paymentAmount,
  paymentDate,
  leagueLoginUrl,
}: {
  memberName: string
  teamName: string
  teamAbbr: string
  paymentMethod: string
  paymentAmount: number
  paymentDate?: string
  leagueLoginUrl: string
}) {
  const dateDisplay = paymentDate
    ? new Date(paymentDate + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  const firstName = memberName.split(' ')[0]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Receipt — 13 Run League</title>
</head>
<body style="margin:0;padding:0;background:#0f1115;font-family:monospace;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="margin-bottom:32px;">
      <p style="color:#39ff14;font-size:40px;font-weight:900;margin:0 0 4px;line-height:1;">13</p>
      <p style="color:#555;font-size:12px;margin:0;letter-spacing:0.1em;text-transform:uppercase;">Run League — Payment Receipt</p>
    </div>

    <!-- Greeting -->
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">
      Hey ${firstName} 👋
    </h1>
    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 32px;">
      Your payment has been received. You're locked in for the season.
    </p>

    <!-- Team Card -->
    <div style="background:#161a1f;border:1px solid #2a2f38;border-left:4px solid #39ff14;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="color:#39ff14;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 8px;">Your Team</p>
      <p style="color:#fff;font-size:24px;font-weight:900;margin:0 0 4px;">${teamName}</p>
      <p style="color:#555;font-size:14px;font-weight:700;letter-spacing:0.15em;margin:0;">${teamAbbr}</p>
    </div>

    <!-- Payment Details -->
    <div style="background:#161a1f;border:1px solid #2a2f38;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="color:#39ff14;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 16px;">Payment Details</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#888;font-size:13px;padding:6px 0;width:120px;">Amount</td>
          <td style="color:#fff;font-size:15px;font-weight:700;padding:6px 0;">$${paymentAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color:#888;font-size:13px;padding:6px 0;">Method</td>
          <td style="color:#fff;font-size:15px;font-weight:700;padding:6px 0;">${paymentMethod}</td>
        </tr>
        ${
          dateDisplay
            ? `<tr>
          <td style="color:#888;font-size:13px;padding:6px 0;">Date</td>
          <td style="color:#fff;font-size:15px;font-weight:700;padding:6px 0;">${dateDisplay}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="color:#888;font-size:13px;padding:6px 0;">Member</td>
          <td style="color:#fff;font-size:15px;font-weight:700;padding:6px 0;">${memberName}</td>
        </tr>
      </table>
    </div>

    <!-- Login CTA -->
    <div style="margin-bottom:32px;">
      <a href="${leagueLoginUrl}" style="display:inline-block;background:#39ff14;color:#000;font-weight:900;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;letter-spacing:0.05em;">
        View League Dashboard →
      </a>
      <p style="color:#555;font-size:12px;margin:10px 0 0;">Use your league password to log in.</p>
    </div>

    <!-- Coming This Season -->
    <div style="background:#161a1f;border:1px solid #2a2f38;border-radius:8px;padding:20px 24px;margin-bottom:32px;">
      <p style="color:#39ff14;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 14px;">Coming This Season</p>
      <ul style="margin:0;padding:0;list-style:none;">
        <li style="color:#ccc;font-size:14px;padding:5px 0;">📲 SMS alerts when your team is chasing 13</li>
        <li style="color:#ccc;font-size:14px;padding:5px 0;">💬 Discord integration for live updates</li>
        <li style="color:#ccc;font-size:14px;padding:5px 0;">📊 Live win probability during games</li>
      </ul>
    </div>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #2a2f38;margin:0 0 24px;" />

    <!-- Bugs / Ideas -->
    <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 24px;">
      Got a bug to report or an idea to share? Reply to this email — we read every one.
    </p>

    <!-- Sign-off -->
    <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 4px;">As always, no wagering, please.</p>
    <p style="color:#39ff14;font-size:14px;font-weight:700;margin:0 0 32px;">— Colby &amp; Cliff</p>

    <!-- Footer -->
    <p style="color:#333;font-size:11px;margin:0;">13runleague.com</p>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Admin auth check
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    payment_method,
    payment_amount,
    payment_date,
    send_to,
  }: {
    payment_method: string
    payment_amount: number
    payment_date?: string
    send_to?: string[]
  } = body

  if (!payment_method || payment_amount == null) {
    return NextResponse.json({ error: 'payment_method and payment_amount are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  // Fetch active members with email
  let membersQuery = supabase
    .from('members')
    .select('id, name, email, assigned_team')
    .eq('league_id', league.id)
    .neq('is_active', false)
    .not('email', 'is', null)
    .neq('email', '')

  if (send_to && send_to.length > 0) {
    membersQuery = membersQuery.in('id', send_to)
  }

  const { data: members, error: membersError } = await membersQuery

  if (membersError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://13runleague.com'
  const leagueLoginUrl = `${appUrl}/league/${slug}`

  // Fetch team name lookup from the teams table (or fallback to abbreviation)
  const teamAbbrs = [...new Set((members ?? []).map((m) => m.assigned_team).filter(Boolean))]
  let teamNameMap: Record<string, string> = {}

  if (teamAbbrs.length > 0) {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('abbreviation, name')
      .in('abbreviation', teamAbbrs)

    if (teamsData) {
      teamNameMap = Object.fromEntries(teamsData.map((t) => [t.abbreviation, t.name]))
    }
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const member of members ?? []) {
    if (!member.email) continue

    // Support comma-separated emails
    const emailAddresses = member.email
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)

    if (emailAddresses.length === 0) continue

    const teamAbbr = member.assigned_team ?? 'TBD'
    const teamName = teamNameMap[teamAbbr] ?? teamAbbr

    const html = buildReceiptHtml({
      memberName: member.name,
      teamName,
      teamAbbr,
      paymentMethod: payment_method,
      paymentAmount: payment_amount,
      paymentDate: payment_date,
      leagueLoginUrl,
    })

    try {
      const { error: sendError } = await resend.emails.send({
        from: '13 Run League <hmfic@13runleague.com>',
        to: emailAddresses,
        cc: ['cliff.lungaretti@gmail.com'],
        replyTo: 'colby@colbyangusblack.com',
        subject: `Payment received — ${league.name} (${teamAbbr})`,
        html,
      })

      if (sendError) {
        failed++
        errors.push(`${member.name}: ${sendError.message}`)
      } else {
        sent++
      }
    } catch (err) {
      failed++
      errors.push(`${member.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return NextResponse.json({ sent, failed, errors })
}
