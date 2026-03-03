-- Add historical rankings tables for npm run seed (Rankings page)
-- Run this in Supabase SQL editor if you already have the main schema applied.

create table if not exists historical_player_rankings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  years_played jsonb not null default '[]',
  teams jsonb not null default '[]',
  total_won integer not null default 0,
  total_shares integer not null default 0,
  is_active boolean not null default false
);

create table if not exists historical_team_rankings (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  thirteen_run_weeks integer not null default 0,
  total_paid_out integer not null default 0,
  years_won jsonb not null default '[]'
);

alter table historical_player_rankings enable row level security;
alter table historical_team_rankings enable row level security;
create policy "historical_player_rankings_public_read" on historical_player_rankings for select using (true);
create policy "historical_team_rankings_public_read" on historical_team_rankings for select using (true);
