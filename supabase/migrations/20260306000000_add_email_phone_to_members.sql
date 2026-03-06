-- Add email and phone columns to members table
-- These were in the original schema.sql but may be missing from production
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email text;
