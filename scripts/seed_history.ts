/**
 * Seed script — South Brooklyn 13 Run League historical data
 *
 * Usage:
 *   npm run seed
 *
 * Requires a league row to already exist in Supabase with the target slug.
 * Set LEAGUE_SLUG env var to override the default 'south-brooklyn'.
 *
 * Populates:
 *   - historical_results: all 8 years × ~30 members
 *   - members: active 2025 members (skips existing rows)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Normalize historical spelling variants → canonical team name
// Applied before inserting into historical_results and looking up abbreviations
const CANONICAL_TEAM: Record<string, string> = {
  // Diamondbacks variants
  'DBacks': 'Diamondbacks',
  'Dbacks': 'Diamondbacks',
  // Athletics variants → A's
  'Athletics': "A's",
  'Athetics': "A's", // typo in source data
  // Indians → Guardians (renamed 2022)
  'Indians': 'Guardians',
  // Cardinals variant
  'Cards': 'Cardinals',
}

// Canonical team name → MLB abbreviation (for the members table)
const TEAM_ABBR: Record<string, string> = {
  'Angels': 'LAA',
  'Astros': 'HOU',
  "A's": 'ATH',
  'Blue Jays': 'TOR',
  'Braves': 'ATL',
  'Brewers': 'MIL',
  'Cardinals': 'STL',
  'Cubs': 'CHC',
  'Diamondbacks': 'ARI',
  'Dodgers': 'LAD',
  'Giants': 'SF',
  'Guardians': 'CLE',
  'Mariners': 'SEA',
  'Marlins': 'MIA',
  'Mets': 'NYM',
  'Nationals': 'WSH',
  'Orioles': 'BAL',
  'Padres': 'SD',
  'Phillies': 'PHI',
  'Pirates': 'PIT',
  'Rangers': 'TEX',
  'Rays': 'TB',
  'Red Sox': 'BOS',
  'Reds': 'CIN',
  'Rockies': 'COL',
  'Royals': 'KC',
  'Tigers': 'DET',
  'Twins': 'MIN',
  'White Sox': 'CWS',
  'Yankees': 'NYY',
}

interface MemberRow {
  name: string
  team: string
  year: number
  paid_in: number
  owes: number
  week_wins: number[]
  total_won: number
}

interface YearData {
  year: number
  members: MemberRow[]
}

interface HistoryJson {
  data: YearData[]
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    console.error('Make sure .env.local has real credentials (not placeholders).')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const slug = process.env.LEAGUE_SLUG ?? 'south-brooklyn'

  // Locate the JSON file
  const jsonPath = path.join(process.cwd(), 'scripts', 'history_import.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: ${jsonPath} not found`)
    process.exit(1)
  }
  const historyData: HistoryJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  // Find the league
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (leagueError || !league) {
    console.error(`Error: League with slug "${slug}" not found.`)
    console.error('Create the league in Supabase first:')
    console.error('  INSERT INTO leagues (name, slug, password_hash) VALUES (...)')
    console.error('Or set LEAGUE_SLUG env var to the correct slug.')
    process.exit(1)
  }

  console.log(`Seeding into league: ${league.name} (${slug})\n`)

  // --- Clear existing historical_results for this league (idempotent re-run) ---
  const { error: deleteError, count } = await supabase
    .from('historical_results')
    .delete({ count: 'exact' })
    .eq('league_id', league.id)

  if (deleteError) {
    console.error('Error clearing existing historical_results:', deleteError.message)
    process.exit(1)
  }
  if ((count ?? 0) > 0) {
    console.log(`  ↩ Cleared ${count} existing historical_results rows\n`)
  }

  // --- Seed historical_results ---
  for (const yearData of historyData.data) {
    const rows = yearData.members.map((m) => {
      const canonicalTeam = CANONICAL_TEAM[m.team] ?? m.team
      return {
        league_id: league.id,
        year: m.year,
        member_name: m.name,
        team: canonicalTeam,
        paid_in: m.paid_in ?? 0,
        total_won: m.total_won ?? 0,
        shares: m.week_wins?.length ?? 0,
        week_wins: m.week_wins ?? [],
      }
    })

    const { error } = await supabase.from('historical_results').insert(rows)
    if (error) {
      console.error(`  ✗ ${yearData.year}: ${error.message}`)
    } else {
      console.log(`  ✓ ${yearData.year}: inserted ${rows.length} members`)
    }
  }

  // --- Seed active 2025 members into members table ---
  console.log('\nSeeding active 2025 members into members table...')

  const year2025 = historyData.data.find((d) => d.year === 2025)
  if (!year2025) {
    console.warn('No 2025 data found — skipping members table seed.')
    return
  }

  // Check for existing members to avoid duplicates
  const { data: existingMembers } = await supabase
    .from('members')
    .select('name')
    .eq('league_id', league.id)

  const existingNames = new Set((existingMembers ?? []).map((m) => m.name))
  let inserted = 0
  let skipped = 0

  for (const m of year2025.members) {
    if (existingNames.has(m.name)) {
      skipped++
      continue
    }

    const canonicalTeam = CANONICAL_TEAM[m.team] ?? m.team
    const abbr = TEAM_ABBR[canonicalTeam]
    if (!abbr) {
      console.warn(`  ⚠ No abbreviation for team "${m.team}" (${m.name}) — skipping member row`)
      continue
    }

    const { error } = await supabase.from('members').insert({
      league_id: league.id,
      name: m.name,
      assigned_team: abbr,
    })

    if (error) {
      console.error(`  ✗ ${m.name}: ${error.message}`)
    } else {
      inserted++
    }
  }

  console.log(`  ✓ Inserted ${inserted} members, skipped ${skipped} existing`)
  console.log('\nDone!')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
