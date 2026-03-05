-- Pre-season state: track which members are returning for the upcoming season
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS pre_season_returning text
    CHECK (pre_season_returning IN ('yes', 'no', 'maybe'));

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS pre_season_paid boolean DEFAULT false;

-- Comment on columns for clarity
COMMENT ON COLUMN members.pre_season_returning IS 'Commissioner-set returning status for upcoming season: yes/no/maybe';
COMMENT ON COLUMN members.pre_season_paid IS 'Whether returning member has paid their first week (pre-season)';
