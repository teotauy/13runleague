-- Fix alumni members auto-created by import_payouts_from_sheets.ts
-- Those members were inserted with only league_id, name, assigned_team and no is_active flag.
-- They have is_active = NULL, which the UI treats as active (is_active !== false).
-- This migration:
--   1. Ensures the is_active column exists on members
--   2. Marks all members created before the import (March 28, 2026) as active
--   3. Marks auto-created alumni (no phone, created during/after import) as inactive

ALTER TABLE members ADD COLUMN IF NOT EXISTS is_active boolean;

-- Mark members created before the import as active (these are the real 2026 roster)
UPDATE members
SET is_active = true
WHERE is_active IS NULL
  AND created_at < '2026-03-28 00:00:00+00';

-- Mark auto-created alumni as inactive:
-- created on/after March 28, no phone (admin-added members always have a phone)
UPDATE members
SET is_active = false
WHERE is_active IS NULL
  AND phone IS NULL
  AND created_at >= '2026-03-28 00:00:00+00';
