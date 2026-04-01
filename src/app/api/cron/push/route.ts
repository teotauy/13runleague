/**
 * Vercel Cron: /api/cron/push
 * Runs every 5 minutes during game hours (noon–midnight ET).
 * Checks today's final MLB games; fires push notifications to all subscribers
 * when any team scores exactly 13 runs. Deduplicates via push_notifications_sent.
 */

import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'
import { baseballToday } from '@/lib/mlb'
import { recalculateStreaks } from '@/lib/streaks'
import { getSeasonYear } from '@/lib/pot'

// ---------------------------------------------------------------------------
// VAPID setup (lazy — avoids env var errors at import time)
// ---------------------------------------------------------------------------

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const publicKey  = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email      = process.env.VAPID_EMAIL ?? 'mailto:admin@13runleague.com'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set')
  }

  webpush.setVapidDetails(email, publicKey, privateKey)
  vapidConfigured = true
}

// ---------------------------------------------------------------------------
// MLB schedule (no-cache — cron needs fresh data)
// ---------------------------------------------------------------------------

interface ScheduleGame {
  gamePk: number
  status:  { abstractGameState: string }
  teams: {
    away: { team: { abbreviation: string; name: string }; score?: number }
    home: { team: { abbreviation: string; name: string }; score?: number }
  }
}

async function fetchTodayFinalGames(): Promise<ScheduleGame[]> {
  const date = baseballToday()
  const url  = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}&gameType=R&hydrate=linescore,team`
  const res  = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []

  const data = await res.json()
  const games: ScheduleGame[] = []

  for (const d of data.dates ?? []) {
    for (const g of d.games ?? []) {
      if (g.status?.abstractGameState !== 'Final') continue
      games.push({
        gamePk: g.gamePk,
        status: g.status,
        teams: {
          away: { team: g.teams.away.team, score: g.teams.away.score },
          home: { team: g.teams.home.team, score: g.teams.home.score },
        },
      })
    }
  }

  return games
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // Auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only run during game hours (12:00–23:59 ET)
  const etHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
    10
  )
  if (etHour < 12) {
    return NextResponse.json({ skipped: 'outside game hours' })
  }

  try {
    ensureVapid()
  } catch (err) {
    console.error('[PushCron] VAPID not configured:', err)
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  // 1. Fetch today's final games
  const games = await fetchTodayFinalGames()
  if (games.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No final games' })
  }

  // 1b. Persist all 13-run finals to game_results so the celebration banner,
  //     winner detection, and payout settlement all work automatically.
  const gameDate = baseballToday()
  const thirteenGameRows = games
    .filter((g) => g.teams.away.score === 13 || g.teams.home.score === 13)
    .map((g) => {
      const winningTeams: string[] = []
      if (g.teams.away.score === 13) winningTeams.push(g.teams.away.team.abbreviation)
      if (g.teams.home.score === 13) winningTeams.push(g.teams.home.team.abbreviation)
      return {
        game_pk:      String(g.gamePk),
        game_date:    gameDate,
        home_team:    g.teams.home.team.abbreviation,
        away_team:    g.teams.away.team.abbreviation,
        home_score:   g.teams.home.score ?? 0,
        away_score:   g.teams.away.score ?? 0,
        was_thirteen: true,
        winning_team: winningTeams.join(','),
        final:        true,
      }
    })

  if (thirteenGameRows.length > 0) {
    await supabase
      .from('game_results')
      .upsert(thirteenGameRows, { onConflict: 'game_pk' })
  }

  // 2. Find teams that scored exactly 13
  const thirteenHits: Array<{ gamePk: string; team: string; abbr: string; opponent: string; score: string }> = []

  for (const game of games) {
    const gamePkStr = String(game.gamePk)
    const away = game.teams.away
    const home = game.teams.home

    if (away.score === 13) {
      thirteenHits.push({
        gamePk:   gamePkStr,
        team:     away.team.name,
        abbr:     away.team.abbreviation,
        opponent: home.team.abbreviation,
        score:    `${away.score}–${home.score ?? '?'}`,
      })
    }
    if (home.score === 13) {
      thirteenHits.push({
        gamePk:   gamePkStr,
        team:     home.team.name,
        abbr:     home.team.abbreviation,
        opponent: away.team.abbreviation,
        score:    `${away.score ?? '?'}–${home.score}`,
      })
    }
  }

  if (thirteenHits.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No 13-run games today (yet)' })
  }

  // 3. Dedup — filter out already-sent notifications
  const keys = thirteenHits.map((h) => `${h.gamePk}|${h.abbr}`)
  const { data: alreadySent } = await supabase
    .from('push_notifications_sent')
    .select('game_pk, team')
    .in('game_pk', thirteenHits.map((h) => h.gamePk))

  const sentSet = new Set(
    (alreadySent ?? []).map((r) => `${r.game_pk}|${r.team}`)
  )

  const toSend = thirteenHits.filter((h) => !sentSet.has(`${h.gamePk}|${h.abbr}`))

  if (toSend.length === 0) {
    return NextResponse.json({ sent: 0, message: 'All already sent' })
  }

  // 4. Fetch all push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No subscribers' })
  }

  // 5. Send notifications
  let sent = 0
  const failedEndpoints: string[] = []

  for (const hit of toSend) {
    const payload = JSON.stringify({
      title: `⚡ ${hit.abbr} scored 13!`,
      body:  `Final: ${hit.abbr} ${hit.score} ${hit.opponent} · 13runleague.com`,
      tag:   `thirteen-${hit.abbr}-${hit.gamePk}`,
      url:   '/',
    })

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (err: any) {
          // 410 Gone = subscription expired; collect for cleanup
          if (err?.statusCode === 410) {
            failedEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // Record as sent (upsert — safe to re-run)
    await supabase
      .from('push_notifications_sent')
      .upsert({ game_pk: hit.gamePk, team: hit.abbr, event_type: 'thirteen' })
  }

  // 6. Recalculate streaks for all leagues — wins count the moment the game ends.
  //    Only runs when toSend had new games (above), so this is a no-op on repeat cron ticks.
  try {
    const { data: leagues } = await supabase.from('leagues').select('id')
    const currentYear = getSeasonYear(new Date())
    await Promise.all(
      (leagues ?? []).map((league) => recalculateStreaks(league.id, currentYear, supabase))
    )
  } catch (err) {
    console.error('[PushCron] Streak recalculation failed (non-fatal):', err)
  }

  // 7. Clean up expired subscriptions
  if (failedEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', failedEndpoints)
  }

  console.log(`[PushCron] Sent ${sent} notifications for ${toSend.length} 13-run game(s). Cleaned up ${failedEndpoints.length} expired subs.`)

  return NextResponse.json({
    sent,
    games: toSend.map((h) => `${h.abbr} ${h.score} ${h.opponent}`),
    cleaned: failedEndpoints.length,
  })
}
