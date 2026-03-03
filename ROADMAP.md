# 13 Run League - Project Roadmap

A baseball pool where members buy MLB teams for $10/week and win the pot if their team scores exactly 13 runs. South Brooklyn's finest labor of love since 2018.

Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Vercel
Repo: teotauy/13runleague
Live: 13runleague.com

---

## How to Use This Roadmap

Each phase is designed to be handed to Claude Code or Cursor as a discrete working session. Copy the phase heading and its task list as your prompt context. The scripts/history_import.json file contains 8 years of pre-processed historical data ready to seed.

---

## Phase 1 - Foundation

Get the database live and historical data seeded. Nothing else works without this.

- [x] 1.1 Run supabase/schema.sql in Supabase SQL editor - creates leagues, members, game_results, streaks, alert_log tables ✓ claude1
- [x] 1.2 Add email column to members table ✓ claude1
- [x] 1.3 Write scripts/seed_history.ts - reads scripts/history_import.json, inserts 8 years of South Brooklyn league data into Supabase ✓ claude1 (8 years × 30 members seeded to Supabase)
- [x] 1.4 Fix MLB Stats API gameType filter - regular season (R) only, filter out spring training and WBC ✓ claude1 (added gameType=R to fetchTodaySchedule and fetchScheduleForDate)
- [x] 1.5 Offseason banner - show from end of regular season (Oct 5) until Opening Day (Mar 25), with countdown to next season ✓ claude1
- [x] 1.6 Spring training banner - Currently showing Spring Training games. MLB Regular Season starts March 25, 2026 ✓ claude1
- [x] 1.7 Favicon and app icons - browser tab, iOS home screen, OG image ✓ claude1

---

## Phase 2 - Core League Features

The minimum viable product for running a real league.

- [ ] 2.1 League creation flow - commissioner sets league name, slug, password, weekly buy-in
- [ ] 2.2 Member roster management - add, edit, remove members; track payment status per week
- [ ] 2.3 Team assignment UI - commissioner assigns 30 MLB teams at season start; support random draw mode
- [ ] 2.4 Draft Room - live team draft at season start; two modes: (a) random assign - commissioner triggers, everyone watches teams get assigned in real time; (b) double-blind draw - 30 sealed envelopes, members pick blind, live reveal
- [ ] 2.5 Weekly pot tracker - shares-based split logic (pot divided by winners that week), rollover if no winners, week runs Sunday-Saturday
- [ ] 2.6 Payment tracking with manual override - mark members as paid (Venmo, cash, Stripe, etc.); commissioner can override any week with a note
- [ ] 2.7 Commissioner result override - manually correct game results, adjust payouts, add notes
- [ ] 2.8 League password auth - cookie-based, middleware enforces noindex on all /league/[slug] routes
- [ ] 2.9 Draft board team rankings - sortable by Win Rate / Dollar Rate / WAR / Spring Training; filterable to available teams only; updates live as teams are picked

---

## Phase 3 - Stats and History

What makes this feel like a real league, not a spreadsheet.

- [ ] 3.1 League page - All-Time Rankings table - sortable by total won / shares / years played; Ironman badge for all 8 years; active player indicator
- [ ] 3.2 League page - Team Rankings table - MLB teams sorted by 13-run weeks in league history, total paid out, years won
- [ ] 3.3 Past Champions Banner - scrolling hall of fame across top of history page; each champion color-coded to their MLB team that year
- [ ] 3.4 Dynasty Tracker - surfaces multi-win seasons and dominant stretches (e.g. Brad Brown 3 wins in 2018, Matt Pariseau 19 shares all-time)
- [ ] 3.5 Historical season browser - year-by-year results, week-by-week breakdown, rollover chains visualized
- [ ] 3.6 Player profile page - career stats, teams held by year, win history, earnings timeline
- [ ] 3.7 Heartbreak Board - teams that reached 12 runs and stopped; running all-time tally; The Cubs have broken hearts 7 times
- [ ] 3.8 Cursed Team Badge - algorithmically determined weekly from probability model
- [ ] 3.9 Random facts widget - first 13-run game in league history, team with most 13-run weeks, team with most 12-run heartbreaks, days since last 13-run game
- [ ] 3.10 Sweat Factor indicator - your team hits 13; real-time probability you end the week as solo winner vs. splitting based on remaining games and Poisson model. Shows something like: Sweat Factor: 34% chance you are sharing this pot
- [ ] 3.11 Advanced stats suite - for both teams and players:
    - Win Rate: 13-run games divided by total games (raw frequency)
    - Dollar Rate: total paid out divided by total games (accounts for splits)
    - WAR (dollars per share): pure efficiency metric. A solo $900 win = $900/share. Five-way split of $300 = $60/share. Very different.
    - Consistency: seasons with at least one win divided by total seasons
    - Clutch: win rate in rollover weeks specifically (higher stakes)
    - Best Season: single year peak earnings
- [ ] 3.12 AI draft scouting reports - one Claude-generated scouting line per team based on their historical stats. Cached at draft time. Examples:
    - The Padres are the most reliable team in league history. 15 wins, strong Dollar Rate, produced in 6 of 8 seasons. High floor, proven ceiling.
    - The Rockies hit 13 often but almost always in splits. Great Win Rate, terrible WAR. You will celebrate a lot and take home less than you think.
    - The Yankees have the highest Dollar Rate in league history but streaky. Four dead years then two monster seasons. High variance pick.

---

## Phase 4 - Live Game Experience

The reason people check their phones during games.

- [ ] 4.1 Probability cards - Poisson model per game, rolling window selector (5/10/20/full), park factors, pitcher adjustment, early season blended model badge
- [ ] 4.2 Live game tracker - real-time score updates via MLB Stats API; poll every 30s during game hours
- [ ] 4.3 Historical probability lookup - use public/data/thirteen_lookup.json for in-game probability (inning + current score); fall back to Poisson if sample under 25
- [ ] 4.4 On Deck Alert - team has 10+ runs after 7th inning, early heads-up: Get ready - Cubs have 11 after 7
- [ ] 4.5 In-app threshold alerts - over 40% show indicator, over 65% highlight card, over 80% banner
- [ ] 4.6 SMS alerts via Twilio - 5 event types:
    - Threshold alert (over 80%): Red Sox have 9 runs in the 6th. P(final=13): 71%
    - Live 13 alert: Red Sox have 13 runs! Game still going...
    - Heartbreak alert: Red Sox just scored run 14.
    - Winner alert: Red Sox did it! Final: Red Sox 13, Yankees 4.
    - Final score: Final - Red Sox 11, Yankees 4.
- [ ] 4.7 Alert deduplication - alert_log table prevents repeat messages per game per event type
- [ ] 4.8 SMS opt-in flow - phone number, team preference, threshold setting, consent checkbox with timestamp, STOP handler

---

## Phase 5 - Public Pages

Discovery and shareability.

- [ ] 5.1 Public dashboard (/) - today's games + probability cards; no login required
- [ ] 5.2 What is a 13 Run League? explainer section on homepage
- [ ] 5.3 /history - all-time 13-run game tracker; searchable by team, year, score
- [ ] 5.4 /matchup/[away]/[home] - head-to-head analysis; historical 13-run rates for each team at that ballpark
- [ ] 5.5 Win Celebration Page - auto-generate shareable image via @vercel/og when a team scores 13; winner name, team, pot amount
- [ ] 5.6 Season Countdown - offseason widget; days until opening day; historical callback from same week last year
- [ ] 5.7 OG meta tags - every public page gets proper share previews for iMessage, Twitter, Discord
- [ ] 5.8 Instagram auto-post - connect central @13runleague account via Meta Graph API; auto-post win celebration image every time any MLB team scores 13; requires instagram_content_publish permission (Meta review 1-2 weeks)
- [ ] 5.9 Instagram growth posts - generic 13 Run League content for league acquisition; Think you could have called that? Start a 13 Run League at 13runleague.com

---

## Phase 6 - Community

Where the banter lives.

- [ ] 6.1 Discord server setup - create South Brooklyn 13 Run League server; enable widget; embed on league page
- [ ] 6.2 Discord bot - auto-post on: team reaches 80% probability, team scores 13, heartbreak miss, weekly winner, rollover milestones (e.g. 4 weeks no winner, pot at $1,200)
- [ ] 6.3 Weekly recap text generator - commissioner tool; plain text summary of that week's results, close calls, current streaks and standings, rollover status; commissioner copies into email or Discord

---

## Phase 7 - Money

Keep it simple. Commissioner is the source of truth.

- [ ] 7.1 Payment status board - per-member, per-week grid; shows paid / unpaid / override
- [ ] 7.2 Manual payment override - commissioner marks any member as paid; add note (e.g. cash at bar, Venmo @colby)
- [ ] 7.3 Pot calculation dashboard - auto-calculates weekly pot from paid members; shows expected vs actual
- [ ] 7.4 Stripe integration (optional v2) - members pay via Stripe; auto-marks as paid; commissioner still has override
- [ ] 7.5 Buy Me a Coffee button - on public homepage and history page

---

## Phase 8 - Legal and Compliance

Required before Twilio SMS goes live.

- [ ] 8.1 /sms-terms page - Twilio compliance; opt-in language, STOP instructions, message frequency, data rates
- [ ] 8.2 /privacy page - data collected, how it is used, contact info
- [ ] 8.3 Twilio use case submission - submit A2P 10DLC registration with proof of consent URL
- [ ] 8.4 Resend domain verification - verify 13runleague.com in Resend dashboard

---

## Phase 9 - Launch

- [ ] 9.1 Connect 13runleague.com domain in Vercel dashboard
- [ ] 9.2 Set all production environment variables in Vercel
- [ ] 9.3 End-to-end test - create league, add members, assign teams, simulate a winning week
- [ ] 9.4 Retrosheet attribution in footer - Historical data from Retrosheet. 20 Sunset Rd., Newark, DE 19711
- [ ] 9.5 Invite first league members for 2026 season
- [ ] 9.6 Legal footer - Not affiliated with MLB or any MLB team. Use team names only, no logos. Built by Red Crow Labs (redcrowlabs.com). As always, no wagering, please.
- [ ] 9.7 Tagline appears in: site footer, SMS terms page, recap text generator output, Instagram posts, Discord bot - As always, no wagering, please.

Built by Red Crow Labs - redcrowlabs.com

---

## Key Data and Context

### Historical Data (scripts/history_import.json)
- 8 seasons: 2018-2025
- 30 members per year, $10/week buy-in, $300 weekly pot
- Year-to-year rollovers tracked and chained correctly
- 2020: 11-week COVID season, $750/week pot
- Name merges already applied, canonical names throughout

### All-Time Leaders

| Rank | Player | Total Won | Shares | Years | WAR ($/share) |
|------|--------|-----------|--------|-------|---------------|
| 1 | Matt Pariseau | $5,650 | 19 | 8 | $297 |
| 2 | Joe Bova | $4,125 | 8 | 6 | $516 |
| 3 | Aaron Goldfarb | $4,000 | 9 | 6 | $444 |
| 4 | Brad Brown | $3,350 | 10 | 8 | $335 |
| 5 | New Cleveland Dave | $3,150 | 10 | 6 | $315 |
| 6 | Cliff Lungaretti | $3,050 | 13 | 8 | $235 |

### Ironmen - All 8 Seasons (2018-2025)
Matt Pariseau, Brad Brown, Cliff Lungaretti, JFC, TJ, Aunt Deb, Whitey, Dianne, Brian Devine, Colby Black

### Luckiest MLB Teams in League History
1. Padres - 15 thirteen-run weeks
2. Giants - 13 times
3. Astros, Rockies, Mets, Phillies - 12 times each

### MLB Licensing Notes
- Team names (Yankees, Red Sox, etc.) are fine - used commercially by DraftKings and every fantasy site
- MLB logos and jersey designs - do NOT use without a license
- Use text-only team references throughout the app
- Footer must say: Not affiliated with MLB or any MLB team

### Probability Engine
- Model: Poisson distribution, lambda = team runs/game
- Adjustments: Park factor (Coors 1.35x), pitcher ERA, rolling window (5/10/20/full)
- Early season: fewer than 10 games = 70% last season + 30% current blended
- Live game: public/data/thirteen_lookup.json - 16.3M plate appearances, lookup by {vis_or_home}|{inning}|{current_score}
- Data: Retrosheet 1901-present

### MLB Stats API
- Schedule: https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD&gameType=R
- Live feed: https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live
- Always filter gameType R for regular season only
- Coors Field venue ID: 19

### Environment Variables (set in Vercel)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- CRON_SECRET
- ANTHROPIC_API_KEY (for AI scouting reports)
- META_ACCESS_TOKEN (for Instagram posting)
- INSTAGRAM_ACCOUNT_ID (for Instagram posting)

### Claude Code and Cursor Session Tips
- Start each session by stating the phase and task numbers you are working on
- scripts/history_import.json is the source of truth for all historical data - do not regenerate it
- public/data/thirteen_lookup.json is the Retrosheet lookup - 936MB uncompressed, reference by key only, never load the whole file into memory
- /lib/probability.ts - Poisson model already implemented
- /lib/mlb.ts - MLB Stats API helpers already implemented
- /lib/alerts.ts - SMS alert logic already scaffolded
- Middleware - league auth via cookie league_auth_{slug}, bcrypt password hashing
- Theme - dark background, neon green accent #39FF14, monospace numbers
- WAR stat = dollars per share (not baseball WAR). Solo $900 win = $900/share. Five-way $300 split = $60/share.
- Sweat Factor = P(no other team scores 13 in remaining games this week) given current team already hit 13

---

Built with love in South Brooklyn. Est. 2018.

As always, no wagering, please.

Built by Red Crow Labs - redcrowlabs.com

