-- Browser push notification subscriptions
-- One row per browser/device subscription.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id        uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint  text    NOT NULL UNIQUE,
  p256dh    text    NOT NULL,
  auth      text    NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Deduplication table — ensures each game/team fires exactly once.
-- Using a composite PK so ON CONFLICT is cheap and index-free.
CREATE TABLE IF NOT EXISTS push_notifications_sent (
  game_pk    text NOT NULL,
  team       text NOT NULL,
  event_type text NOT NULL DEFAULT 'thirteen',
  sent_at    timestamptz DEFAULT now(),
  PRIMARY KEY (game_pk, team, event_type)
);

-- RLS: required by Supabase security advisor
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Anyone can register a push subscription (INSERT); service role manages reads/deletes
CREATE POLICY IF NOT EXISTS "push_subscriptions_public_insert"
  ON push_subscriptions FOR INSERT WITH CHECK (true);
