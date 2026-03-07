/**
 * seed_retrosheet_games.ts
 *
 * Seeds game_results with every MLB game where exactly 13 runs were scored
 * by either team, from 1901 to present — using Retrosheet game log files.
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *
 * 1. Download Retrosheet game logs:
 *    https://www.retrosheet.org/gamelogs/index.html
 *    Download the "complete" GL1871_2024.zip (or individual year files)
 *    Extract all .TXT files into:  scripts/retrosheet/
 *
 * 2. Run:
 *    npx tsx scripts/seed_retrosheet_games.ts
 *
 * The script is idempotent — re-running clears and re-seeds.
 * It only inserts rows where home_score = 13 OR away_score = 13.
 *
 * ── Retrosheet game log format ───────────────────────────────────────────────
 * Each row is a comma-separated line. Key fields (0-indexed):
 *   0  date          YYYYMMDD
 *   1  double-header  0=no, 1=first, 2=second
 *   3  visitor team  Retrosheet 3-char code
 *   9  visitor score integer
 *   6  home team     Retrosheet 3-char code
 *  10  home score    integer
 *
 * See: https://www.retrosheet.org/gamelogs/glfields.txt
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ── Retrosheet team code → MLB abbreviation ───────────────────────────────────
// Retrosheet uses historical codes; we map to modern MLB API abbreviations.
// Teams that moved or renamed get the current franchise abbreviation.
const RETRO_TO_ABBR: Record<string, string> = {
  // AL
  BAL: 'BAL', BOS: 'BOS', CHA: 'CWS', CLE: 'CLE', DET: 'DET',
  HOU: 'HOU', KCA: 'KC',  LAA: 'LAA', MIN: 'MIN', NYA: 'NYY',
  OAK: 'ATH', SEA: 'SEA', TBA: 'TB',  TEX: 'TEX', TOR: 'TOR',
  // Historical AL franchises → modern equivalent
  MLA: 'BAL',  // Milwaukee Brewers (AL, 1901) → became Baltimore Orioles
  SLA: 'BAL',  // St. Louis Browns → Baltimore Orioles
  WS1: 'MIN',  // Washington Senators (orig) → Twins
  WS2: 'TEX',  // Washington Senators (expansion) → Rangers
  PHA: 'ATH',  // Philadelphia Athletics
  KCА: 'ATH',  // Kansas City A's → Oakland A's
  // NL
  ATL: 'ATL', CHN: 'CHC', CIN: 'CIN', COL: 'COL', LAN: 'LAD',
  MIA: 'MIA', MIL: 'MIL', NYN: 'NYM', PHI: 'PHI', PIT: 'PIT',
  SDN: 'SD',  SFN: 'SF',  SLN: 'STL', WAS: 'WSH', ARI: 'ARI',
  // Historical NL franchises → modern equivalent
  BSN: 'ATL',  // Boston Braves → Milwaukee → Atlanta Braves
  MLN: 'ATL',  // Milwaukee Braves → Atlanta
  BR1: 'LAD',  // Brooklyn Dodgers → LA
  BRO: 'LAD',  // Brooklyn Dodgers variant
  NY1: 'SF',   // New York Giants → San Francisco Giants
  FLO: 'MIA',  // Florida Marlins
  MON: 'WSH',  // Montreal Expos → Washington Nationals
  // Federal League, early franchises — map to closest modern team or skip
  // (The script will skip any team code not in this map)
}

interface GameRow {
  game_pk: string
  game_date: string       // ISO YYYY-MM-DD
  home_team: string       // modern abbr
  away_team: string       // modern abbr
  home_score: number
  away_score: number
  final: boolean
  was_thirteen: boolean
  winning_team: string | null
}

function parseDate(raw: string): string | null {
  // Retrosheet: "19540714" → "1954-07-14"
  if (raw.length !== 8) return null
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

async function processFile(filePath: string): Promise<GameRow[]> {
  const rows: GameRow[] = []
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (!line.trim()) continue
    const fields = line.split(',').map((f) => f.replace(/^"|"$/g, '').trim())

    const rawDate    = fields[0]
    const doubleHdr  = fields[1] ?? '0'
    const awayCode   = fields[3]
    const homeCode   = fields[6]
    const awayScore  = parseInt(fields[9], 10)
    const homeScore  = parseInt(fields[10], 10)

    if (isNaN(awayScore) || isNaN(homeScore)) continue

    const awayAbbr = RETRO_TO_ABBR[awayCode]
    const homeAbbr = RETRO_TO_ABBR[homeCode]
    if (!awayAbbr || !homeAbbr) continue  // skip unmapped/defunct franchises

    const gameDate = parseDate(rawDate)
    if (!gameDate) continue

    // Only store games where exactly 13 was scored by at least one team
    const homeIs13 = homeScore === 13
    const awayIs13 = awayScore === 13
    if (!homeIs13 && !awayIs13) continue

    // Unique key: date + home team + double-header indicator
    const gamePk = `retro-${rawDate}-${homeCode}-${doubleHdr}`

    // winning_team: if both scored 13 it's a split / both win
    // We store the team(s) as comma-separated if both hit 13 the same game
    let winningTeam: string | null = null
    if (homeIs13 && awayIs13) {
      winningTeam = `${homeAbbr},${awayAbbr}`  // split pot
    } else if (homeIs13) {
      winningTeam = homeAbbr
    } else {
      winningTeam = awayAbbr
    }

    rows.push({
      game_pk: gamePk,
      game_date: gameDate,
      home_team: homeAbbr,
      away_team: awayAbbr,
      home_score: homeScore,
      away_score: awayScore,
      final: true,
      was_thirteen: true,
      winning_team: winningTeam,
    })
  }

  return rows
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const glDir    = path.join(process.cwd(), 'scripts', 'retrosheet')

  if (!fs.existsSync(glDir)) {
    console.error(`\nRetrosheet directory not found: ${glDir}`)
    console.error('Create it and download game log .TXT files from:')
    console.error('  https://www.retrosheet.org/gamelogs/index.html\n')
    process.exit(1)
  }

  const files = fs.readdirSync(glDir)
    .filter((f) => f.match(/^GL\d{4}\.TXT$/i))
    .sort()

  if (files.length === 0) {
    console.error('No GL*.TXT files found in scripts/retrosheet/')
    console.error('Download game log files from retrosheet.org/gamelogs\n')
    process.exit(1)
  }

  console.log(`Found ${files.length} Retrosheet game log files\n`)

  // Collect all 13-run games
  const allRows: GameRow[] = []
  for (const file of files) {
    const rows = await processFile(path.join(glDir, file))
    if (rows.length > 0) {
      const year = file.match(/\d{4}/)?.[0]
      console.log(`  ${year}: ${rows.length} thirteen-run games`)
    }
    allRows.push(...rows)
  }

  console.log(`\nTotal: ${allRows.length.toLocaleString()} thirteen-run games across all history`)

  // Clear existing Retrosheet rows (idempotent)
  console.log('\nClearing existing retrosheet rows from game_results...')
  const { error: deleteError } = await supabase
    .from('game_results')
    .delete()
    .like('game_pk', 'retro-%')

  if (deleteError) {
    console.error('Error clearing:', deleteError.message)
    process.exit(1)
  }

  // Insert in batches of 500
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH)
    const { error } = await supabase.from('game_results').insert(batch)
    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message)
    } else {
      inserted += batch.length
      process.stdout.write(`\r  Inserted ${inserted.toLocaleString()} / ${allRows.length.toLocaleString()}`)
    }
  }

  console.log('\n\nDone! Reload the league page to see lore stats populate.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
