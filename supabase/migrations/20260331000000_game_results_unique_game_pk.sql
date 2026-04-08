-- Add unique constraint on game_pk so the push cron can upsert live results
-- Retrosheet games use prefix "retro-" so live MLB gamePks (numeric strings) don't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS game_results_game_pk_unique
  ON game_results (game_pk);
