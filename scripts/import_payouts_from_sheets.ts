/**
 * Import per-week payout data from the Google Sheet CSV exports
 * into the Supabase `payouts` table.
 *
 * Usage:
 *   npx tsx scripts/import_payouts_from_sheets.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script:
 *   1. Fetches each year's tab from the Google Sheet as CSV
 *   2. Parses per-member per-week payout amounts
 *   3. Resolves member names → member IDs from the members table
 *   4. Upserts payout records into the payouts table
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const LEAGUE_SLUG = 'south-brooklyn'

const SHEET_ID = '1E7iWi0zoLohkY02VRi_UgeT1KTOAEVvdxaJkmr8PRiQ'

// Years with actual payout data in the sheet
const YEARS = [2018, 2019, 2021, 2022, 2023, 2024, 2025]
// 2020 is template-only (COVID shortened season — no weekly data)

// Canonical team name → MLB abbreviation
const TEAM_ABBR: Record<string, string> = {
  'Angels': 'LAA',
  'Astros': 'HOU',
  "A's": 'ATH',
  'Athletics': 'ATH',
  'Athetics': 'ATH', // typo in sheet
  'Blue Jays': 'TOR',
  'Braves': 'ATL',
  'Brewers': 'MIL',
  'Cardinals': 'STL',
  'Cards': 'STL',
  'Cubs': 'CHC',
  'Diamondbacks': 'ARI',
  'DBacks': 'ARI',
  'Dbacks': 'ARI',
  'Dodgers': 'LAD',
  'Giants': 'SF',
  'Guardians': 'CLE',
  'Indians': 'CLE',
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

// Normalize member name variants across years → members table names
const CANONICAL_MEMBER: Record<string, string> = {
  // Active members with name variants
  'Robyn': 'Robyn Walters',
  'Cliff': 'Cliff Lungaretti',
  'Brad': 'Brad Brown',
  'Devine': 'Brian Devine',
  'Dave (NCD)': 'New Cleveland Dave',
  'Katie': 'Katie Pariseau',
  'Katie P': 'Katie Pariseau',
  'Matt': 'Matt Pariseau',
  'Matt P': 'Matt Pariseau',
  'Dianne (CL Mom)': 'Dianne',
  'Bova': 'Jonathan Bova',
  'Jon Bova': 'Jonathan Bova',
  'Michael Schmitt & Ben Klein': 'the Schmitt/Klein Consortium',
  'Schmitt & Klein': 'the Schmitt/Klein Consortium',
  // Alumni — create as alumni members if missing
  'Erick': 'Erick Browning',
  'Erick Browning': 'Erick Browning',
  'Emily Harms': 'Emily Harms',
  'Harms': 'Emily Harms',
  'Charlie Brown': 'Charlie Brown',
  'Charlie': 'Charlie Brown',
  'Jordan': 'Jordan',
  'Shelby': 'Shelby',
  'Paco': 'Paco',
  'TVH': 'TVH',
  'Todd': 'Todd',
  'JJ Owen': 'JJ Owen',
  'Samantha': 'Samantha',
  'Ryan Mahoney': 'Ryan Mahoney',
  'Bryan Daniels': 'Bryan Daniels',
  'Gabe Aguilar': 'Gabe Aguilar',
  'Fletcher': 'Fletcher',
  'Ian from Sidecar': 'Ian from Sidecar',
  'MF': 'Megan from Jake\'s',
  "Megan from Jake's": "Megan from Jake's",
  'Chad': 'Chad Hamilton',
  'Chad Hamilton': 'Chad Hamilton',
  'Michael Wilt': 'Michael Wilt',
  'Joe Alesci': 'Joe Alesci',
  'Donny': 'Donny',
  'Rob': 'Rob',
  'Rob ': 'Rob',
  'PJ': 'PJ',
  'Allen': 'Allen',
  'Kat': 'Kat',
  'Derek': 'Derek',
  'Dave': 'Dave',
  'Loam': 'Loam',
  'Matt Illig': 'Matt Illig',
}

function normalizeMemberName(name: string): string {
  const trimmed = name.trim()
  return CANONICAL_MEMBER[trimmed] ?? trimmed
}

function teamToAbbr(teamName: string): string | null {
  const trimmed = teamName.trim()
  if (!trimmed) return null
  const abbr = TEAM_ABBR[trimmed]
  if (abbr) return abbr
  // Maybe it's already an abbreviation
  if (trimmed.length <= 3 && trimmed === trimmed.toUpperCase()) return trimmed
  console.warn(`  ⚠ Unknown team: "${trimmed}"`)
  return trimmed.toUpperCase()
}

interface ParsedPayout {
  memberName: string
  team: string // abbreviation
  weekNumber: number
  amount: number
  year: number
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i]
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current)
        current = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && csvText[i + 1] === '\n') i++
        row.push(current)
        current = ''
        if (row.some(c => c.trim())) rows.push(row)
        row = []
      } else {
        current += ch
      }
    }
  }
  row.push(current)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}

function parseYearCSV(csv: string, year: number): ParsedPayout[] {
  const rows = parseCSV(csv)
  const payouts: ParsedPayout[] = []

  if (rows.length < 3) {
    console.warn(`  ⚠ Not enough rows for year ${year}`)
    return payouts
  }

  // Find the week number header row (contains "1", "2", "3"...)
  // and the row with member data starts
  let weekNumRow = -1
  let firstWeekCol = -1
  let lastWeekCol = -1

  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r]
    for (let c = 0; c < row.length; c++) {
      if (row[c].trim() === '1') {
        // Check if next cells are 2, 3...
        if (c + 1 < row.length && row[c + 1].trim() === '2') {
          weekNumRow = r
          firstWeekCol = c
          // Find last week column
          for (let cc = c; cc < row.length; cc++) {
            const val = parseInt(row[cc].trim())
            if (!isNaN(val) && val >= 1 && val <= 28) {
              lastWeekCol = cc
            }
          }
          break
        }
      }
    }
    if (weekNumRow >= 0) break
  }

  if (weekNumRow < 0 || firstWeekCol < 0) {
    console.warn(`  ⚠ Could not find week header row for year ${year}`)
    return payouts
  }

  const weekNumbers: number[] = []
  for (let c = firstWeekCol; c <= lastWeekCol; c++) {
    const val = parseInt(rows[weekNumRow][c]?.trim())
    weekNumbers.push(isNaN(val) ? 0 : val)
  }

  console.log(`  Found weeks ${weekNumbers[0]}–${weekNumbers[weekNumbers.length - 1]} in columns ${firstWeekCol}–${lastWeekCol}`)

  // Determine which columns have Name and Team
  // The sheet format varies slightly by year. Find the name/team columns.
  // Generally: Name is col 0 or 1, Team is col 1 or 2
  let nameCol = -1
  let teamCol = -1

  // Look for "Name" in the header rows
  for (let r = 0; r <= weekNumRow + 1 && r < rows.length; r++) {
    for (let c = 0; c < Math.min(6, rows[r].length); c++) {
      if (rows[r][c].trim().toLowerCase() === 'name') nameCol = c
      if (rows[r][c].trim().toLowerCase() === 'team') teamCol = c
    }
  }

  if (nameCol < 0) {
    // Fallback: in some years, name is in the row after a number prefix
    // 2021+ format: col 0 = row number, col 1 = name, col 2 = team
    // 2018-2019 format: col 0 = name, col 1 = team
    // Detect by checking if first data row's col 0 is a number
    const dataStartRow = weekNumRow + 2 // skip header rows
    for (let r = dataStartRow; r < rows.length; r++) {
      const col0 = rows[r][0]?.trim()
      if (col0 && !col0.startsWith('Total') && !col0.startsWith('20')) {
        if (/^\d+$/.test(col0)) {
          nameCol = 1
          teamCol = 2
        } else {
          nameCol = 0
          teamCol = 1
        }
        break
      }
    }
  }

  if (nameCol < 0) {
    console.warn(`  ⚠ Could not determine name column for year ${year}`)
    return payouts
  }

  console.log(`  Name col: ${nameCol}, Team col: ${teamCol}`)

  // Parse member rows (skip header rows and summary rows)
  const dataStartRow = weekNumRow + 2 // skip week headers + date row
  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r]
    const rawName = row[nameCol]?.trim()
    if (!rawName) continue

    // Skip summary/total rows
    if (rawName.toLowerCase().startsWith('total') ||
        rawName.startsWith('20') ||  // "2018 Carryover" etc.
        rawName === '' ||
        rawName.startsWith('*')) continue

    const rawTeam = row[teamCol]?.trim()
    if (!rawTeam) continue

    // Skip non-member rows (like "IN 2020", "OUT 2020")
    if (rawTeam.includes('IN ') || rawTeam.includes('OUT ')) continue

    const memberName = normalizeMemberName(rawName)
    const teamAbbr = teamToAbbr(rawTeam)
    if (!teamAbbr) continue

    // Parse weekly payouts
    for (let wi = 0; wi < weekNumbers.length; wi++) {
      const wk = weekNumbers[wi]
      if (!wk || wk < 1 || wk > 28) continue

      const colIdx = firstWeekCol + wi
      if (colIdx >= row.length) continue

      const cellVal = row[colIdx]?.trim().replace(/[$,]/g, '')
      if (!cellVal) continue

      const amount = parseInt(cellVal)
      if (isNaN(amount) || amount <= 0) continue

      payouts.push({
        memberName,
        team: teamAbbr,
        weekNumber: wk,
        amount,
        year,
      })
    }
  }

  return payouts
}

async function fetchSheetCSV(year: number): Promise<string | null> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${year}`
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for year ${year}`)
      return null
    }
    return await res.text()
  } catch (err) {
    console.warn(`  ⚠ Fetch error for year ${year}:`, err)
    return null
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Get league ID
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id')
    .eq('slug', LEAGUE_SLUG)
    .single()

  if (leagueErr || !league) {
    console.error('Could not find league:', LEAGUE_SLUG, leagueErr)
    process.exit(1)
  }

  console.log(`League: ${LEAGUE_SLUG} (${league.id})`)

  // Get all members for name → ID mapping
  const { data: members } = await supabase
    .from('members')
    .select('id, name')
    .eq('league_id', league.id)

  const memberIdByName = new Map<string, string>()
  for (const m of members ?? []) {
    memberIdByName.set(m.name, m.id)
    memberIdByName.set(m.name.toLowerCase(), m.id)
  }

  // Also check historical_results for member names that might not be in members
  const { data: histMembers } = await supabase
    .from('historical_results')
    .select('member_name')
    .eq('league_id', league.id)

  const allHistNames = new Set((histMembers ?? []).map(h => h.member_name))

  let totalInserted = 0
  let totalSkipped = 0
  const unmatchedMembers = new Set<string>()

  for (const year of YEARS) {
    console.log(`\n━━━ ${year} ━━━`)
    const csv = await fetchSheetCSV(year)
    if (!csv) {
      console.log(`  Skipped (no data)`)
      continue
    }

    const payouts = parseYearCSV(csv, year)
    console.log(`  Parsed ${payouts.length} payout entries`)

    if (payouts.length === 0) continue

    // Delete existing payouts for this year to avoid duplicates
    const { error: delErr } = await supabase
      .from('payouts')
      .delete()
      .eq('league_id', league.id)
      .eq('year', year)

    if (delErr) {
      console.error(`  Error deleting existing payouts for ${year}:`, delErr)
      continue
    }

    // Resolve member names and insert
    const toInsert: Array<{
      league_id: string
      member_id: string
      week_number: number
      year: number
      winning_team: string
      payout_amount: number
      shares_count: number
      game_date: string
    }> = []

    for (const p of payouts) {
      // Try to resolve member ID
      let memberId = memberIdByName.get(p.memberName)
        ?? memberIdByName.get(p.memberName.toLowerCase())

      // Try fuzzy match: first name or partial
      if (!memberId) {
        for (const [name, id] of memberIdByName) {
          if (name.toLowerCase().startsWith(p.memberName.toLowerCase().split(' ')[0]) &&
              p.memberName.length > 2) {
            memberId = id
            break
          }
        }
      }

      if (!memberId) {
        // Auto-create as alumni member
        if (p.memberName.length > 1) {
          console.log(`    Creating alumni member: "${p.memberName}" (${p.team})`)
          const { data: newMember, error: createErr } = await supabase
            .from('members')
            .insert({
              league_id: league.id,
              name: p.memberName,
              assigned_team: p.team,
            })
            .select('id')
            .single()

          if (createErr) {
            console.log(`      ✗ Create error: ${createErr.message}`)
            // Might already exist from a race condition, try to fetch
            const { data: existing } = await supabase
              .from('members')
              .select('id')
              .eq('league_id', league.id)
              .eq('name', p.memberName)
              .single()
            if (existing?.id) {
              memberId = existing.id
              memberIdByName.set(p.memberName, existing.id)
              memberIdByName.set(p.memberName.toLowerCase(), existing.id)
            } else {
              unmatchedMembers.add(p.memberName)
              continue
            }
          } else if (newMember?.id) {
            memberId = newMember.id
            memberIdByName.set(p.memberName, newMember.id)
            memberIdByName.set(p.memberName.toLowerCase(), newMember.id)
          }
        }
        if (!memberId) {
          unmatchedMembers.add(p.memberName)
          continue
        }
      }

      // Estimate game_date from week number (approximate — Monday of that week)
      // Season starts ~March 25
      const seasonStart = new Date(year, 2, 25) // March 25
      const gameDate = new Date(seasonStart)
      gameDate.setDate(gameDate.getDate() + (p.weekNumber - 1) * 7)
      const gameDateStr = gameDate.toISOString().slice(0, 10)

      toInsert.push({
        league_id: league.id,
        member_id: memberId,
        week_number: p.weekNumber,
        year: p.year,
        winning_team: p.team,
        payout_amount: p.amount,
        shares_count: 1,
        game_date: gameDateStr,
      })
    }

    if (toInsert.length > 0) {
      // Batch insert in chunks of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50)
        const { error: insertErr } = await supabase
          .from('payouts')
          .insert(batch)

        if (insertErr) {
          console.error(`  Insert error (batch ${i / 50 + 1}):`, insertErr)
          totalSkipped += batch.length
        } else {
          totalInserted += batch.length
        }
      }
      console.log(`  ✓ Inserted ${toInsert.length} payouts`)
    }

    if (toInsert.length < payouts.length) {
      console.log(`  ⚠ Skipped ${payouts.length - toInsert.length} (no member match)`)
      totalSkipped += payouts.length - toInsert.length
    }
  }

  console.log(`\n━━━ SUMMARY ━━━`)
  console.log(`Total inserted: ${totalInserted}`)
  console.log(`Total skipped: ${totalSkipped}`)

  if (unmatchedMembers.size > 0) {
    console.log(`\nUnmatched member names (need manual mapping):`)
    for (const name of [...unmatchedMembers].sort()) {
      console.log(`  - "${name}"`)
    }
  }
}

main().catch(console.error)
