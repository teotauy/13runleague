/**
 * Runs the historical_results dedup — deletes duplicate rows
 * (same league_id + member_name + year + team), keeping highest total_won.
 *
 * Run: env $(cat .env.local | grep -v '#' | xargs) npx tsx scripts/run_dedup_migration.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function runDedup() {
  console.log('Fetching all historical_results...')
  const { data, error } = await supabase
    .from('historical_results')
    .select('id, league_id, member_name, year, team, total_won')
    .order('total_won', { ascending: false })

  if (error) { console.error('Error:', error); process.exit(1) }

  console.log(`Fetched ${data.length} rows`)

  const seen = new Set<string>()
  const toDelete: number[] = []

  for (const row of data) {
    const key = `${row.league_id}|${row.member_name}|${row.year}|${row.team}`
    if (seen.has(key)) {
      toDelete.push(row.id)
    } else {
      seen.add(key)
    }
  }

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found — database is clean')
    return
  }

  console.log(`Found ${toDelete.length} duplicate rows: IDs ${toDelete.join(', ')}`)
  const { error: delErr } = await supabase
    .from('historical_results')
    .delete()
    .in('id', toDelete)

  if (delErr) { console.error('Delete error:', delErr); process.exit(1) }
  console.log(`✅ Deleted ${toDelete.length} duplicate rows`)
  console.log('\n⚠️  Still needed: run the UNIQUE constraint manually in Supabase SQL Editor:')
  console.log('   supabase/migrations/20260304120000_dedup_historical_results.sql')
}

runDedup().catch(console.error)
