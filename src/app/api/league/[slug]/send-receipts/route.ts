import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getTeamBlurbs } from '@/lib/teamBlurbs'

function isAdmin(value: string | undefined) {
  return value === 'admin' || value === 'authenticated'
}

const TEAM_NAMES: Record<string, string> = {
  ARI: 'Arizona Diamondbacks', ATH: 'Athletics', ATL: 'Atlanta Braves',
  BAL: 'Baltimore Orioles', BOS: 'Boston Red Sox', CHC: 'Chicago Cubs',
  CWS: 'Chicago White Sox', CIN: 'Cincinnati Reds', CLE: 'Cleveland Guardians',
  COL: 'Colorado Rockies', DET: 'Detroit Tigers', HOU: 'Houston Astros',
  KC: 'Kansas City Royals', LAA: 'Los Angeles Angels', LAD: 'Los Angeles Dodgers',
  MIA: 'Miami Marlins', MIL: 'Milwaukee Brewers', MIN: 'Minnesota Twins',
  NYM: 'New York Mets', NYY: 'New York Yankees', PHI: 'Philadelphia Phillies',
  PIT: 'Pittsburgh Pirates', SD: 'San Diego Padres', SEA: 'Seattle Mariners',
  SF: 'San Francisco Giants', STL: 'St. Louis Cardinals', TB: 'Tampa Bay Rays',
  TEX: 'Texas Rangers', TOR: 'Toronto Blue Jays', WSH: 'Washington Nationals',
}

function buildEmailHtml({
  memberName,
  teamAbbr,
  leagueName,
  leagueUrl,
  leaguePassword,
}: {
  memberName: string
  teamAbbr: string
  leagueName: string
  leagueUrl: string
  leaguePassword?: string
}) {
  const firstName = memberName.split(' ')[0]
  const teamName = TEAM_NAMES[teamAbbr.toUpperCase()] ?? teamAbbr
  const [b1, b2, b3] = getTeamBlurbs(teamAbbr)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in — ${leagueName}</title>
</head>
<body style="margin:0;padding:0;background:#0f1115;font-family:monospace;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="margin-bottom:32px;border-bottom:1px solid #2a2f38;padding-bottom:24px;">
      <p style="color:#39ff14;font-size:42px;font-weight:900;margin:0 0 4px;line-height:1;">13</p>
      <p style="color:#555;font-size:11px;margin:0;letter-spacing:0.12em;text-transform:uppercase;">Run League · 2026 Season</p>
    </div>

    <!-- Greeting -->
    <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 6px;">
      ${firstName}, you're in.
    </h1>
    <p style="color:#9ca3af;font-size:15px;margin:0 0 28px;">
      You've got the <strong style="color:#ffffff;">${teamName}</strong>.
    </p>

    <!-- Team Blurbs -->
    <div style="background:#161a1f;border:1px solid #2a2f38;border-left:3px solid #39ff14;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#39ff14;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 14px;">About your team</p>
      <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 10px;padding-left:16px;border-left:1px solid #2a2f38;">— ${b1}</p>
      <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 10px;padding-left:16px;border-left:1px solid #2a2f38;">— ${b2}</p>
      <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0;padding-left:16px;border-left:1px solid #2a2f38;">— ${b3}</p>
    </div>

    <!-- The Vibe -->
    <p style="color:#d1d5db;font-size:14px;line-height:1.8;margin:0 0 28px;">
      Nothing has to change from this year to last year. You can not check one score and just accept your paydays and not put in any effort. Or you can be obsessive about it and sweat every pitch in every game and watch live as the P(13) changes. Both are completely valid approaches to this league.
    </p>

    <!-- Login -->
    <div style="background:#161a1f;border:1px solid #2a2f38;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="color:#39ff14;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 14px;">Your league</p>
      <p style="margin:0 0 8px;font-size:14px;color:#9ca3af;">
        <span style="color:#d1d5db;font-weight:700;">Dashboard:</span>
        <a href="${leagueUrl}" style="color:#39ff14;text-decoration:none;margin-left:8px;">${leagueUrl}</a>
      </p>
      ${leaguePassword ? `<p style="margin:0;font-size:14px;color:#9ca3af;"><span style="color:#d1d5db;font-weight:700;">Password:</span> <span style="color:#39ff14;margin-left:8px;letter-spacing:0.05em;">${leaguePassword}</span></p>` : ''}
    </div>

    <!-- Coming Soon -->
    <div style="margin-bottom:32px;">
      <p style="color:#555;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 12px;">Coming this season</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;">📲 SMS alerts when your team gets close to 13</p>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;">💬 League Discord</p>
      <p style="color:#9ca3af;font-size:13px;margin:0;">⚡ Live win probability as games happen</p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #2a2f38;padding-top:24px;">
      <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Got a bug or a great idea? Reply to this email.</p>
      <p style="color:#9ca3af;font-size:13px;font-style:italic;margin:0 0 4px;">As always, no wagering, please.</p>
      <p style="color:#39ff14;font-size:14px;font-weight:700;margin:0;">— Colby &amp; Cliff</p>
    </div>

  </div>
</body>
</html>`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`league_auth_${slug}`)
  if (!isAdmin(authCookie?.value)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const leaguePassword: string | undefined = body.leaguePassword
  const sendTo: string[] | undefined = body.sendTo

  const supabase = createServiceClient()

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  let query = supabase
    .from('members')
    .select('id, name, email, assigned_team')
    .eq('league_id', league.id)
    .neq('is_active', false)
    .not('email', 'is', null)
    .neq('email', '')

  if (sendTo && sendTo.length > 0) {
    query = query.in('id', sendTo)
  }

  const { data: members, error: membersError } = await query

  if (membersError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://13runleague.com'
  const leagueUrl = `${appUrl}/league/${slug}`

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const member of members ?? []) {
    if (!member.email || !member.assigned_team) continue

    const emailAddresses = member.email
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean)

    if (emailAddresses.length === 0) continue

    const html = buildEmailHtml({
      memberName: member.name,
      teamAbbr: member.assigned_team,
      leagueName: league.name,
      leagueUrl,
      leaguePassword,
    })

    // Stay under Resend's 5 req/sec rate limit
    await new Promise((r) => setTimeout(r, 250))

    try {
      const { error: sendError } = await resend.emails.send({
        from: '13 Run League <hmfic@13runleague.com>',
        to: emailAddresses,
        cc: ['cliff.lungaretti@gmail.com'],
        replyTo: 'colby@colbyangusblack.com',
        subject: `You're in. 2026 ${league.name}.`,
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
