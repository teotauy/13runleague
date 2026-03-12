-- Remove duplicate historical_results rows, keeping the row with the highest total_won
-- (covers the case where npm run seed was run more than once for the same league)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY league_id, member_name, year, team
      ORDER BY total_won DESC, id ASC
    ) AS rn
  FROM historical_results
)
DELETE FROM historical_results
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Prevent future duplicates: one row per member per year per team per league
ALTER TABLE historical_results
  DROP CONSTRAINT IF EXISTS historical_results_unique_member_year_team;

ALTER TABLE historical_results
  ADD CONSTRAINT historical_results_unique_member_year_team
  UNIQUE (league_id, member_name, year, team);
