-- Fix Cliff Lungaretti's 2020 data
-- Row was showing shares=0, total_won=0 but he won Week 1 (Red Sox, $1,050)
-- Confirmed via Supabase SQL Editor: single row, team=Red Sox

UPDATE historical_results
SET
  shares    = 1,
  total_won = 1050
WHERE
  year        = 2020
  AND member_name = 'Cliff Lungaretti'
  AND league_id   = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
