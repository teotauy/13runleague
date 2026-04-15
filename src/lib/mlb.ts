/**
 * MLB Stats API fetchers for 13 Run League.
 * Base URL: https://statsapi.mlb.com
 */

import { normalizeTeamAbbr } from '@/lib/teamColors'

const MLB_API = 'https://statsapi.mlb.com'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MLBTeam {
  id: number
  abbreviation: string
  name: string
  teamName: string
}

export interface MLBVenue {
  id: number
  name: string
}

export interface MLBProbablePitcher {
  id: number
  fullName: string
  era?: number
}

export interface MLBGame {
  gamePk: number
  gameDate: string
  status: {
    abstractGameState: string // 'Preview' | 'Live' | 'Final'
    detailedState: string
    statusCode: string
  }
  teams: {
    away: {
      team: MLBTeam
      score?: number
      leagueRecord: { wins: number; losses: number }
    }
    home: {
      team: MLBTeam
      score?: number
      leagueRecord: { wins: number; losses: number }
    }
  }
  venue: MLBVenue
  probablePitchers?: {
    away?: MLBProbablePitcher
    home?: MLBProbablePitcher
  }
}

export interface MLBLiveGame {
  gamePk: number
  gameData: {
    status: { abstractGameState: string; detailedState: string }
    teams: {
      away: MLBTeam
      home: MLBTeam
    }
    venue: MLBVenue
    probablePitchers?: {
      away?: MLBProbablePitcher
      home?: MLBProbablePitcher
    }
  }
  liveData: {
    linescore: {
      currentInning: number
      currentInningOrdinal: string
      isTopInning: boolean
      outs: number // 0, 1, 2, or 3
      runners?: {
        first?: { playerId: number }
        second?: { playerId: number }
        third?: { playerId: number }
      }
      teams: {
        away: { runs: number; hits: number; errors: number }
        home: { runs: number; hits: number; errors: number }
      }
      innings: Array<{
        num: number
        away: { runs?: number }
        home: { runs?: number }
      }>
    }
    boxscore: {
      teams: {
        away: { teamStats: { batting: { runs: number } } }
        home: { teamStats: { batting: { runs: number } } }
      }
    }
  }
}

export interface TeamSeason {
  teamId: number
  gamesPlayed: number
  runsPerGame: number
  totalRuns: number
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * Formats a Date to a YYYY-MM-DD string in Eastern Time.
 */
function etDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

/**
 * Returns the current "baseball date" (YYYY-MM-DD) in Eastern Time.
 *
 * Baseball day doesn't turn over until 6 AM ET — a game that starts on
 * March 3rd and runs until 2 AM due to rain delays or extra innings is
 * still a March 3rd game as far as the schedule is concerned.
 */
export function baseballToday(): string {
  const now = new Date()

  // Get the current hour in ET
  const etHourParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const etHour = parseInt(etHourParts.find((p) => p.type === 'hour')!.value, 10)

  // Before 6 AM ET → still the previous baseball day
  if (etHour < 6) {
    return etDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  }

  return etDateString(now)
}

function todayDate(): string {
  return baseballToday()
}

export async function fetchTodaySchedule(): Promise<MLBGame[]> {
  const date = todayDate()
  const url = `${MLB_API}/api/v1/schedule?sportId=1&date=${date}&gameType=R&hydrate=probablePitcher(note),linescore,team,venue`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`MLB schedule fetch failed: ${res.status}`)

  const data = await res.json()
  const games: MLBGame[] = []

  for (const date of data.dates ?? []) {
    for (const game of date.games ?? []) {
      games.push(normalizeGame(game))
    }
  }

  return games
}

/**
 * Fetch all regular-season games between two dates (YYYY-MM-DD, inclusive).
 * Lightweight hydration — team names + status only — used for week-ahead game counts
 * and the Sweat Factor calculation (no pitcher/linescore needed).
 */
export async function fetchDateRangeSchedule(start: string, end: string): Promise<MLBGame[]> {
  const url = `${MLB_API}/api/v1/schedule?sportId=1&startDate=${start}&endDate=${end}&gameType=R&hydrate=team`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const data = await res.json()
  const games: MLBGame[] = []
  for (const dateEntry of data.dates ?? []) {
    for (const game of dateEntry.games ?? []) {
      games.push(normalizeGame(game))
    }
  }
  return games
}

export async function fetchScheduleForDate(date: string): Promise<MLBGame[]> {
  const url = `${MLB_API}/api/v1/schedule?sportId=1&date=${date}&gameType=R&hydrate=probablePitcher(note),linescore,team,venue`

  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`MLB schedule fetch failed: ${res.status}`)

  const data = await res.json()
  const games: MLBGame[] = []

  for (const dateEntry of data.dates ?? []) {
    for (const game of dateEntry.games ?? []) {
      games.push(normalizeGame(game))
    }
  }

  return games
}

function canonTeam(team: MLBTeam): MLBTeam {
  const abbr = String(team.abbreviation ?? '').toUpperCase()
  return { ...team, abbreviation: normalizeTeamAbbr(abbr) }
}

function normalizeGame(raw: Record<string, unknown>): MLBGame {
  const teams = raw.teams as Record<string, Record<string, unknown>>
  const venue = raw.venue as Record<string, unknown>
  const status = raw.status as Record<string, unknown>
  const awayT = canonTeam(teams.away.team as MLBTeam)
  const homeT = canonTeam(teams.home.team as MLBTeam)

  return {
    gamePk: raw.gamePk as number,
    gameDate: raw.gameDate as string,
    status: {
      abstractGameState: status.abstractGameState as string,
      detailedState: status.detailedState as string,
      statusCode: status.statusCode as string,
    },
    teams: {
      away: {
        team: awayT,
        score: teams.away.score as number | undefined,
        leagueRecord: teams.away.leagueRecord as { wins: number; losses: number },
      },
      home: {
        team: homeT,
        score: teams.home.score as number | undefined,
        leagueRecord: teams.home.leagueRecord as { wins: number; losses: number },
      },
    },
    venue: { id: venue.id as number, name: venue.name as string },
    probablePitchers: raw.probablePitchers as MLBGame['probablePitchers'],
  }
}

function normalizeLiveFeedTeams(feed: MLBLiveGame): MLBLiveGame {
  const away = feed.gameData?.teams?.away
  const home = feed.gameData?.teams?.home
  if (!away?.abbreviation || !home?.abbreviation) return feed
  return {
    ...feed,
    gameData: {
      ...feed.gameData,
      teams: {
        away: canonTeam(away),
        home: canonTeam(home),
      },
    },
  }
}

// ---------------------------------------------------------------------------
// On This Day — historical 13-run games
// ---------------------------------------------------------------------------

export interface OnThisDayGame {
  year: number
  date: string // YYYY-MM-DD
  awayTeam: string
  homeTeam: string
  awayScore: number
  homeScore: number
  thirteenTeam: string // which team(s) scored 13
}

/**
 * Fetches all MLB games on today's calendar date (MM-DD) from 2000 through
 * the previous completed season where any team scored exactly 13 runs.
 * Results are cached indefinitely since historical data never changes.
 */
export async function fetchOnThisDayThirteens(monthDay: string): Promise<OnThisDayGame[]> {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2000 }, (_, i) => 2000 + i)

  const results = await Promise.allSettled(
    years.map(async (year) => {
      const date = `${year}-${monthDay}`
      const url = `${MLB_API}/api/v1/schedule?sportId=1&date=${date}&hydrate=linescore,team`
      const res = await fetch(url, { cache: 'force-cache' })
      if (!res.ok) return []

      const data = await res.json()
      const games: OnThisDayGame[] = []

      for (const dateEntry of data.dates ?? []) {
        for (const game of dateEntry.games ?? []) {
          if (game.status?.abstractGameState !== 'Final') continue
          const away = game.teams?.away
          const home = game.teams?.home
          const awayScore = away?.score ?? away?.linescore?.teams?.away?.runs
          const homeScore = home?.score ?? home?.linescore?.teams?.home?.runs
          if (awayScore == null || homeScore == null) continue
          if (awayScore !== 13 && homeScore !== 13) continue

          const thirteenTeams = [
            awayScore === 13 ? away.team?.abbreviation : null,
            homeScore === 13 ? home.team?.abbreviation : null,
          ].filter(Boolean).join(' & ')

          games.push({
            year,
            date,
            awayTeam: away.team?.abbreviation ?? '???',
            homeTeam: home.team?.abbreviation ?? '???',
            awayScore,
            homeScore,
            thirteenTeam: thirteenTeams,
          })
        }
      }

      return games
    })
  )

  return results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => b.year - a.year)
}

// ---------------------------------------------------------------------------
// Live feed
// ---------------------------------------------------------------------------

export async function fetchLiveFeed(gamePk: number): Promise<MLBLiveGame> {
  const url = `${MLB_API}/api/v1.1/game/${gamePk}/feed/live`

  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) throw new Error(`MLB live feed fetch failed: ${res.status}`)

  const feed = (await res.json()) as MLBLiveGame
  return normalizeLiveFeedTeams(feed)
}

/**
 * Client-side live feed fetch without Next.js revalidation
 * Use this in React components for real-time polling (e.g., LiveWatchCard)
 */
export async function fetchLiveFeedClient(gamePk: number): Promise<MLBLiveGame> {
  const url = `${MLB_API}/api/v1.1/game/${gamePk}/feed/live`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`MLB live feed fetch failed: ${res.status}`)

  const feed = (await res.json()) as MLBLiveGame
  return normalizeLiveFeedTeams(feed)
}

// ---------------------------------------------------------------------------
// Team season stats
// ---------------------------------------------------------------------------

export async function fetchTeamSeasonStats(
  teamId: number,
  season: number,
  window?: number
): Promise<TeamSeason> {
  const url = `${MLB_API}/api/v1/teams/${teamId}/stats?stats=season&group=hitting&season=${season}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    return { teamId, gamesPlayed: 0, runsPerGame: 4.5, totalRuns: 0 }
  }

  const data = await res.json()
  const splits = data.stats?.[0]?.splits ?? []
  if (splits.length === 0) {
    return { teamId, gamesPlayed: 0, runsPerGame: 4.5, totalRuns: 0 }
  }

  const stat = splits[0].stat
  const gamesPlayed = stat.gamesPlayed ?? 0
  const totalRuns = stat.runs ?? 0

  // If rolling window requested, fetch game log
  if (window && window < gamesPlayed) {
    const windowed = await fetchWindowedRunsPerGame(teamId, season, window)
    if (windowed !== null) {
      return { teamId, gamesPlayed, runsPerGame: windowed, totalRuns }
    }
  }

  const runsPerGame = gamesPlayed > 0 ? totalRuns / gamesPlayed : 4.5

  return { teamId, gamesPlayed, runsPerGame, totalRuns }
}

async function fetchWindowedRunsPerGame(
  teamId: number,
  season: number,
  window: number
): Promise<number | null> {
  try {
    const url = `${MLB_API}/api/v1/teams/${teamId}/stats?stats=gameLog&group=hitting&season=${season}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const data = await res.json()
    const splits: Array<{ stat: { runs: number } }> = data.stats?.[0]?.splits ?? []

    if (splits.length === 0) return null

    const recent = splits.slice(-window)
    const totalRuns = recent.reduce((sum, g) => sum + (g.stat.runs ?? 0), 0)
    return totalRuns / recent.length
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Pitcher ERA lookup
// ---------------------------------------------------------------------------

export async function fetchPitcherEra(pitcherId: number, season: number): Promise<number | null> {
  try {
    const url = `${MLB_API}/api/v1/people/${pitcherId}/stats?stats=season&group=pitching&season=${season}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null

    const data = await res.json()
    const splits = data.stats?.[0]?.splits ?? []
    if (splits.length === 0) return null

    const era = parseFloat(splits[0].stat?.era ?? '')
    return isNaN(era) ? null : era
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Last season runs per game (for early-season blending)
// ---------------------------------------------------------------------------

export async function fetchLastSeasonRunsPerGame(
  teamId: number,
  season: number
): Promise<number | null> {
  return fetchTeamSeasonStats(teamId, season - 1).then((s) =>
    s.gamesPlayed >= 10 ? s.runsPerGame : null
  )
}

// ---------------------------------------------------------------------------
// All teams
// ---------------------------------------------------------------------------

export async function fetchAllTeams(): Promise<MLBTeam[]> {
  const url = `${MLB_API}/api/v1/teams?sportId=1`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error('Failed to fetch teams')
  const data = await res.json()
  return data.teams as MLBTeam[]
}

// ---------------------------------------------------------------------------
// Team game log (for scorigami data)
// ---------------------------------------------------------------------------

export interface GameLogEntry {
  date: string
  runsScored: number
  opponent: string
  isHome: boolean
  gamePk: number
}

export async function fetchTeamGameLog(
  teamId: number,
  season: number
): Promise<GameLogEntry[]> {
  try {
    const url = `${MLB_API}/api/v1/schedule?sportId=1&teamId=${teamId}&season=${season}&gameType=R&hydrate=linescore,team`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []

    const data = await res.json()
    const entries: GameLogEntry[] = []

    for (const dateEntry of data.dates ?? []) {
      for (const game of dateEntry.games ?? []) {
        if (game.status?.abstractGameState !== 'Final') continue

        const isHome = game.teams.home.team.id === teamId
        const runsScored = isHome
          ? (game.teams.home.score ?? 0)
          : (game.teams.away.score ?? 0)
        const opponent = normalizeTeamAbbr(
          String(
            isHome ? game.teams.away.team.abbreviation : game.teams.home.team.abbreviation
          ).toUpperCase()
        )

        entries.push({
          date: game.gameDate.split('T')[0],
          runsScored,
          opponent,
          isHome,
          gamePk: game.gamePk,
        })
      }
    }

    return entries
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Current season helper
// ---------------------------------------------------------------------------

export function currentSeason(): number {
  const now = new Date()
  // MLB season typically starts in March; if before March, use last year
  return now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1
}
