/**
 * MLB Stats API fetchers for 13 Run League.
 * Base URL: https://statsapi.mlb.com
 */

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
      away: { team: MLBTeam }
      home: { team: MLBTeam }
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

function todayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export async function fetchTodaySchedule(): Promise<MLBGame[]> {
  const date = todayDate()
  const url = `${MLB_API}/api/v1/schedule?sportId=1&date=${date}&hydrate=probablePitcher(note),linescore,team,venue`

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

export async function fetchScheduleForDate(date: string): Promise<MLBGame[]> {
  const url = `${MLB_API}/api/v1/schedule?sportId=1&date=${date}&hydrate=probablePitcher(note),linescore,team,venue`

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

function normalizeGame(raw: Record<string, unknown>): MLBGame {
  const teams = raw.teams as Record<string, Record<string, unknown>>
  const venue = raw.venue as Record<string, unknown>
  const status = raw.status as Record<string, unknown>

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
        team: teams.away.team as MLBTeam,
        score: teams.away.score as number | undefined,
        leagueRecord: teams.away.leagueRecord as { wins: number; losses: number },
      },
      home: {
        team: teams.home.team as MLBTeam,
        score: teams.home.score as number | undefined,
        leagueRecord: teams.home.leagueRecord as { wins: number; losses: number },
      },
    },
    venue: { id: venue.id as number, name: venue.name as string },
    probablePitchers: raw.probablePitchers as MLBGame['probablePitchers'],
  }
}

// ---------------------------------------------------------------------------
// Live feed
// ---------------------------------------------------------------------------

export async function fetchLiveFeed(gamePk: number): Promise<MLBLiveGame> {
  const url = `${MLB_API}/api/v1.1/game/${gamePk}/feed/live`

  const res = await fetch(url, { next: { revalidate: 15 } })
  if (!res.ok) throw new Error(`MLB live feed fetch failed: ${res.status}`)

  return res.json()
}

/**
 * Client-side live feed fetch without Next.js revalidation
 * Use this in React components for real-time polling (e.g., LiveWatchCard)
 */
export async function fetchLiveFeedClient(gamePk: number): Promise<MLBLiveGame> {
  const url = `${MLB_API}/api/v1.1/game/${gamePk}/feed/live`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`MLB live feed fetch failed: ${res.status}`)

  return res.json()
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
        const opponent = isHome
          ? game.teams.away.team.abbreviation
          : game.teams.home.team.abbreviation

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
