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
  email text,                  -- for weekly recap emails
  created_at timestamptz default now()
);

-- Weekly Payments (payment status per member per week)
create table weekly_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  week_number integer not null,          -- week 1-52
  payment_status text default 'unpaid',  -- 'unpaid', '50%', 'paid'
  override_note text,                    -- commissioner notes (e.g. "cash at bar")
  updated_at timestamptz default now()
);

create index on weekly_payments (member_id, week_number);

-- Draft Sessions (team draft tracking at season start)
create table draft_sessions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  draft_mode text not null,              -- 'random-assign' or 'double-blind'
  draft_status text default 'pending',   -- 'pending', 'in_progress', 'completed'
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Draft Picks (tracks each team picked during draft)
create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid references draft_sessions(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  team_abbr text not null,
  pick_order integer,                    -- 1-30 for order of picks
  picked_at timestamptz default now()
);

create index on draft_sessions (league_id, draft_status);
create index on draft_picks (draft_session_id);

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
  closest_miss_score integer,
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
alter table weekly_payments enable row level security;
alter table draft_sessions enable row level security;
alter table draft_picks enable row level security;

-- Public read for game_results (historical data is public)
create policy "game_results_public_read"
  on game_results for select using (true);

-- Historical results (yearly per-member stats for all-time rankings)
create table historical_results (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  year integer not null,
  member_name text not null,
  team text not null,
  paid_in integer default 0,
  total_won integer default 0,
  shares integer default 0,         -- count of winning weeks
  week_wins integer[] default '{}', -- week numbers won
  created_at timestamptz default now()
);

create index on historical_results (league_id, year);
alter table historical_results enable row level security;
create policy "historical_results_public_read"
  on historical_results for select using (true);

-- Weekly Pot Ledger (tracks pot state per week for audit trail)
create table weekly_pot_ledger (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  week_number integer not null,
  year integer not null,
  pot_amount integer not null,           -- base pot amount (e.g., $300)
  rollover_from_week integer,            -- previous week if no winners
  number_of_winners integer default 0,
  payout_per_share integer default 0,
  calculated_at timestamptz,
  created_at timestamptz default now()
);

create unique index on weekly_pot_ledger (league_id, year, week_number);
alter table weekly_pot_ledger enable row level security;

-- Payouts (core payout tracking per winner per week)
create table payouts (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  week_number integer not null,
  year integer not null,
  winning_team text not null,            -- team abbreviation that scored 13
  payout_amount integer not null,        -- amount member earned
  shares_count integer default 1,        -- how many winners split the pot
  game_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on payouts (league_id, year, week_number);
create index on payouts (member_id, year);
alter table payouts enable row level security;

-- Service role has full access (used by API routes with SUPABASE_SERVICE_ROLE_KEY)
