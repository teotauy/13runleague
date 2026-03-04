-- Restore South Brooklyn League after database wipe on 2026-03-03
-- This migration inserts the south-brooklyn league row
-- Password: qawZeg-gosnaz-0gyfhy (hashed with bcryptjs)

INSERT INTO leagues (id, name, slug, password_hash, pot_total, weekly_buy_in, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'South Brooklyn',
  'south-brooklyn',
  '$2b$10$UzJ4A99gr2NoQ.PNjT.fq.7XQyp5O5D4aQnNciJBoY4NuxMpj2.5W',
  0,
  10,
  now()
)
ON CONFLICT (slug) DO NOTHING;
