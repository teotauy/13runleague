-- 13 Run League — Supabase schema
-- Run this in the Supabase SQL editor to initialize your database.

-- Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  password_hash text not null,
  pot_total integer default 0,
  weekly_buy_in integer default 10,
  rules jsonb,
  created_at timestamptz default now()
);

-- Members
create table members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  assigned_team text not null, -- MLB team abbreviation e.g. "BOS"
  phone text,                  -- for SMS alerts
  created_at timestamptz default now()
);

-- Game Results
create table game_results (
  id uuid primary key default gen_random_uuid(),
  game_pk text not null,
  game_date date not null,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  venue_id text,
  final boolean default false,
  was_thirteen boolean default false,
  winning_team text, -- team abbrev that scored 13, if any
  created_at timestamptz default now()
);

-- Streaks (computed and cached)
create table streaks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  current_streak integer default 0,
  longest_streak integer default 0,
  closest_miss_score integer, -- e.g. 12 or 14
  closest_miss_date date,
  updated_at timestamptz default now()
);

-- Indexes
create index on members (league_id);
create index on streaks (member_id);
create index on game_results (game_date);
create index on game_results (was_thirteen) where was_thirteen = true;

-- RLS: leagues and members are private by default
alter table leagues enable row level security;
alter table members enable row level security;
alter table game_results enable row level security;
alter table streaks enable row level security;

-- Public read for game_results (historical data is public)
create policy "game_results_public_read"
  on game_results for select using (true);

-- Service role has full access (used by API routes with SUPABASE_SERVICE_ROLE_KEY)
