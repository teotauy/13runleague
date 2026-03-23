# Thirteen Run League — Roadmap

## ✅ Completed

### Data & Admin
- [x] Supabase RPC functions to bypass row cap (`get_opponent_game_counts`, `get_all_allowed_counts`)
- [x] Merge Zack → Zack Fogelman in `historical_results`
- [x] Merge Robyn → Robyn Walters in `historical_results`
- [x] Merge Dave → Cleveland Dave in `historical_results`
- [x] Atomic rename RPC (`rename_member`) — updates both `members` and `historical_results` in one transaction
- [x] `is_active boolean default true` column on `members` for soft-deactivate (alumni)
- [x] Admin PATCH endpoint handles name changes, `is_active` toggle, and field updates without clobbering

### Roster / Members
- [x] Active / Alumni / All filter tabs with counts
- [x] Years-played column (derived from `historical_results`)
- [x] "Alumni" soft-deactivate button (yellow) — keeps member in DB, marks inactive
- [x] "Reactivate" button (blue) for alumni
- [x] Alumni rows shown at 60% opacity with `alumni` badge

### League / Rankings
- [x] Player links working in All-Time rankings (case-insensitive name match → member ID)
- [x] Player links working in year-tab views (`LeagueTabs`, `SeasonYearTabs`)
- [x] Years column hidden in single-year tab views (redundant when tab already scopes year)
- [x] Team links in Team Rankings tab

### Team Page
- [x] Home vs Visitor donut chart — green (home) on bottom half, red (visitor) on top (scorecard orientation)
- [x] Opponent chart (`OpponentChart.tsx`) with COUNT / SHARE toggle
  - COUNT: raw 13-run games scored vs each opponent
  - SHARE: this team's count as % of opponent's all-time 13-run-allowed games
  - SHARE shows example sentence explaining the metric
  - Minimum 5 allowed-games threshold before SHARE is shown

### Player Page
- [x] Blue Jays (and other long team names) text-aligned in avatar circles

---

## 🔲 Pending / Known Issues

### Data Integrity
- [ ] Alumni and All tabs in Roster are empty — needs investigation (likely a filter bug in `MemberRoster.tsx`)
- [ ] Error state for duplicate-name rename (two Chris Williams edge case — no FK between `historical_results` and `members`)
- [ ] Long-term: add `member_id` FK column to `historical_results` to make name matching robust

### Admin
- [ ] Recalculate Streaks button — exists in admin UI, hasn't been triggered yet for current data
- [ ] Rename feature needs error UI if name already exists or would cause ambiguity

### Notifications / Alerts
- [ ] Sentry error alerts — set up email or Slack notification channel in Sentry dashboard
- [ ] Monthly waitlist emails — manual Resend broadcasts (no automation yet)
- [ ] **4.8** SMS alerts via Twilio — 5 event types:
  - **Threshold alert** (>80% P13): "Red Sox have 9 runs in the 6th. P(final=13): 71%"
  - **Live 13 alert**: "Red Sox have 13 runs! Game still going..."
  - **Heartbreak alert**: "Red Sox just scored run 14."
  - **Winner alert**: "Red Sox did it! Final: Red Sox 13, Yankees 4."
  - **Final score**: "Final - Red Sox 11, Yankees 4."
- [ ] **4.9** Alert deduplication — `alert_log` table prevents repeat messages per game per event type
- [ ] **4.10** SMS opt-in flow — phone number, team preference, threshold setting, consent checkbox with timestamp, STOP handler

### Live / Real-time
- [x] Win celebration banner (`WinCelebration.tsx`) — slides down from top with confetti in team colors, shows winner name, team badge, game date, payout. Dismisses via localStorage (shows once per win).
- [x] Public homepage 13-run celebration (`ThirteenCelebration.tsx`) — fires when any team scores 13 today, shows team name + opponent in team colors with confetti. No player name. Dismisses via localStorage per game.

### Future / Bigger Features
- [ ] Day-of-week chart on team page
- [ ] Stripe Connect integration for multi-league money handling (dues → hold → payout → platform fee)
- [ ] Multi-league SaaS model — sell league access, hold funds, make payouts, keep fee
  - Requires Stripe Connect (sub-accounts per league)
  - Legal: money transmitter territory — use Stripe to shield; consult lawyer before scaling
  - Fee model options: per-league SaaS, % of transaction, or both

---

## Architecture Notes

- `historical_results.member_name` is a plain string — no FK to `members.id`
  - Rename RPC is safe for unique names; ambiguous for two people sharing a name
  - Mitigation: disambiguate at entry time (e.g. "Chris W. (2)")
- Supabase free tier has a row-return cap — always use RPC for aggregations
- `is_active` defaults to `true`; alumni = `is_active = false` (never hard-deleted)
