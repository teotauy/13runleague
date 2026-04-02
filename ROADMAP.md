# Thirteen Run League — Roadmap

## Deploy Strategy (as of March 2026)
- **Bug fixes** → push immediately as needed
- **New features** → build locally, hold, batch push at start of next Vercel billing cycle
- Goal: minimize build minutes on Vercel Pro while keeping the app stable for Opening Day 2026

---

## ✅ Completed

### Design & UI
- [x] Dark theme overhaul — `bg-[#0f1115]` + stadium seat SVG texture across all pages
- [x] Luma-inspired card depth — `bg-white/[0.025] border border-white/[0.07]` + shadows
- [x] `module-card`, `section-label`, `stadium-texture` global CSS utility classes
- [x] SeasonBanner — dismissible top bar with countdown to Opening Day / Spring Training / Live states
- [x] OnThisDayMLB — 13-run games on this date in MLB history
- [x] ThirteenCelebration — public homepage flash when any team scores 13 today (team colors + confetti, no player name)
- [x] Win celebration banner (`WinCelebration.tsx`) — slides down with confetti, winner name, team badge, payout. Dismisses via localStorage per win.

### Emails
- [x] Send Season Emails feature — personalized HTML email per member (team, blurbs, dashboard URL, password)
- [x] `teamBlurbs.ts` — 3 funny-but-true blurbs per all 30 MLB teams
- [x] Rate limit fix — 250ms delay between Resend sends (stays under 5 req/sec free tier)
- [x] Member picker in modal — checkbox list, All/None toggles, send to subset
- [x] `localStorage` persistence of failed IDs — retry survives page reload
- [x] Blurb accuracy fixes — Soto to NYM not NYY, Arenado to ARI not STL, Corbin contract expired

### Email Content Rules (non-negotiable)
- **No player-specific claims** until data-driven blurbs are built from retrosheet. AI hallucinations about rosters = embarrassing.
- **No pitchers. Ever.** This league is about scoring exactly 13 runs. Nobody cares about pitchers.
- **Full email preview required** — commissioner reads every word before send is enabled.
- **When in doubt, use team personality/history, not player names.** "The Cubs are due" > "Seiya Suzuki will..."

### Data & Admin
- [x] Supabase RPC functions to bypass row cap (`get_opponent_game_counts`, `get_all_allowed_counts`)
- [x] Merge Zack → Zack Fogelman in `historical_results`
- [x] Merge Robyn → Robyn Walters in `historical_results`
- [x] Merge Dave → Cleveland Dave in `historical_results`
- [x] Atomic rename RPC (`rename_member`) — updates both `members` and `historical_results` in one transaction
- [x] `is_active boolean default true` column on `members` for soft-deactivate (alumni)
- [x] Admin PATCH endpoint handles name changes, `is_active` toggle, and field updates without clobbering
- [x] CIN (Cincinnati Reds) added to `TeamAssignment.tsx` and both random-assign APIs — was missing, causing only 29 teams to appear in draft

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

## 🐛 Bugs — Fix & Push Immediately

- [ ] **[PRE-OPENING DAY]** Audit + strip all player-specific claims from `teamBlurbs.ts` — replace with team personality/history only until data-driven blurbs land
- [ ] **[PRE-OPENING DAY]** Payment status missing from season emails — add paid/unpaid status + Venmo nudge for unpaid
- [ ] **[PRE-OPENING DAY]** Email preview — show full rendered email in modal before sending (no more Soto-on-Yankees situations)
- [ ] **[PRE-OPENING DAY]** League password not persisted to localStorage for retry — type it once, it survives reload
- [ ] **[PRE-OPENING DAY]** 15 members received retry email without league password — send follow-up or reply from hmfic@
- [ ] Alumni and All tabs in Roster are empty — likely a filter bug in `MemberRoster.tsx`
- [ ] Error state for duplicate-name rename (two Chris Williams edge case — no FK between `historical_results` and `members`)
- [ ] Rename feature needs error UI if name already exists or would cause ambiguity
- [ ] Recalculate Streaks button — exists in admin UI, hasn't been triggered yet for 2026 data
- [ ] Sentry error alerts — set up email or Slack notification channel in Sentry dashboard

---

## 🔜 Soon

### Cloudflare Zero Trust Auth
Replace the shared-password league gate and cookie-based admin check with proper identity auth — zero code changes required on the app side.

**Phase 1 — Admin (do this first, 30 min):**
- Create a CF Access application scoped to `13runleague.com/league/*/admin*`
- Policy: email allowlist = commissioner's email only
- Auth method: email OTP (one-time code to inbox) or Google
- The `isAdmin()` cookie check stays as defense-in-depth, but CF is the real gate
- Result: no more shared admin password; commissioner logs in with their own email

**Phase 2 — Full league gate (optional, later):**
- Extend CF Access to cover `13runleague.com/league/*`
- Policy: email allowlist = all active members
- Replaces the shared league password + `/league/[slug]/login` page entirely
- Bonus: CF injects `Cf-Access-Authenticated-User-Email` header → app knows *who* is viewing → enables personalized "your team is playing today" banners, member-specific dashboard highlights
- Remove or archive: `isAdmin()` cookie auth, login page, password-in-cookie flow

**Prerequisites:**
- Domain must be proxied through Cloudflare (orange cloud in DNS). Currently pointing to Vercel — add CF as proxy layer, set SSL to Full (strict).
- Exclude from Zero Trust: `/api/cron/*` (already uses `CRON_SECRET`), `/api/league/*/push-subscribe`, all public routes (`/`, `/teams/*`, etc.)

**Cost:** Free. CF Zero Trust free tier supports up to 50 users.

### Member Hearts (Favorite Teams) — Unlocked by CF Auth
Once CF Zero Trust is live and the app can read `Cf-Access-Authenticated-User-Email`, add per-member favorite team selection.

**Features:**
- Dashboard: "Your Team: WSH | Your Hearts: BOS, NYY"
- Heart icon next to team names across the app to toggle
- Favorites persist in a `member_favorites` table
- SMS alerts fire for both assigned team + all hearted teams
- "On Deck" and "13 Alert" notifications scoped to member's teams
- Leaderboard highlights: your team + hearts in a special color

**Why wait for CF auth first?** Without authenticated identity, you don't know who's viewing. With CF, the app always knows the member's email → can load their hearts instantly.

---

## 🔒 Features — Hold for Next Billing Cycle

### Data-Driven Team Blurbs (Retrosheet 1901–present)
Replace generic team blurbs with stats no one else in the world has — pulled from our own 13-run game dataset.

Stat ideas per team:
- Total times scored exactly 13 since franchise founding (all-time rank vs rest of MLB)
- Most recent 13-run game (date + opponent + final score)
- Best single season (year with most 13-run games)
- Current drought (days/games since last 13)
- Home vs away split — do they score 13 more at home?
- Most common inning they reach 13 (if we have inning data)

Implementation:
- Query `games` table grouped by team, filter `home_score = 13` OR `away_score = 13`
- Generate a `teamStats` lookup at build time (or via API route cached at build)
- Replace or supplement static blurbs in `teamBlurbs.ts` with real numbers
- Could be a `getTeamStats(abbr)` function that returns structured data for email + web use

This is genuinely exclusive content — no other site has 13-run-specific stats by franchise going back to 1901.

### Weekly Recap Email
Commissioner-composed weekly blast, same styling as season opener email. Due first use: **Sunday March 29**.

Commissioner workflow:
- Sunday morning: open admin → "Weekly Recap" tab
- Auto-generated **briefing** surfaces the week's notable data (commissioner picks what's salient, ignores the rest)
- Commissioner writes their note in a textarea — their voice, their jokes, their take
- Full preview renders the complete email before send is enabled — nothing goes out unapproved

Auto-pulled data for the briefing:
- Any 13-run game that week (league winner + team)
- Near-miss teams (11, 12, 14 scores) — "the Orioles keep knocking on the door"
- League standings, current pot size, rollover status
- Hot hitters from MLB Stats API — HR, RBI, multi-hit weeks. Relevant to run scoring only. **Hot pitching: never.**
- **Streak narratives** (generated from `week_wins` data):
  - Win drought broken — "Cliff's first win since Week 4. 8 weeks of heartbreak."
  - Winning streak extended — "TJ wins for the third straight week."
  - Cross-season drought — "Whitey hasn't won since August 2025."
  - First win ever — flagged for newer members

Email sections:
- Header: `13` green logo + season/week label
- **Winner card** — team color accent, member name, team name, `$[amount] paid out`
- OR **Rollover card** in amber — "$X rolls to next week"
- Commissioner's note (styled like a letter)
- Standings snapshot + pot size reminder
- Footer: same as opener

Build plan:
- **Shipped (baseline):** `WeeklyRecapSection.tsx` on admin — load preview (iframe) + confirm-before-send; `src/lib/weeklyRecapActions.ts` server actions (`previewWeeklyRecapEmail`, `sendWeeklyRecapEmail`) so auth uses the same `cookies()` as the admin page (no separate API route).
- **Still to build:** `WeeklyRecapModal.tsx` — briefing panel + winner picker + rollover toggle + write-up textarea (commissioner voice)
- **Still to build:** `/api/league/[slug]/weekly-briefing` — aggregates streak data, near-misses, MLB hot hitters
- Season opener emails use 250ms spacing between Resend calls; weekly recap currently sends one broadcast (`to` array) — revisit rate limits if Resend limits change

### Homepage & Design
- [ ] Logo / wordmark — no mark exists yet; explore SVG concept built in-browser
- [ ] Grain/noise texture overlay on hero (Luma-style depth)
- [ ] Big bold hero section — "13 runs. One winner." energy
- [ ] Module cards with small-caps headers: `TODAY'S HUNT`, `ON THIS DAY`, `THE LORE`
- [ ] Collapsible 13-Run History — show most recent 1, [+] more opens next 10
- [ ] Collapsible League Explainer — show teaser, [+] more expands full explanation
- [ ] Probability tooltip on live games — explain what 0.31% actually means

### Co-ownership
- [ ] Co-owner display — league table shows both names on same team row
- [ ] Team page shows both as co-owners in header
- [ ] Payout recording notes split when co-owners win (two names, half amount each)
- [ ] Win celebration shows both names for co-owned teams

### Notifications
- [ ] Monthly waitlist emails — manual Resend broadcasts (no automation yet)
- [ ] **4.8** SMS alerts via Twilio — 5 event types:
  - **Threshold alert** (>80% P13): "Red Sox have 9 runs in the 6th. P(final=13): 71%"
  - **Live 13 alert**: "Red Sox have 13 runs! Game still going..."
  - **Heartbreak alert**: "Red Sox just scored run 14."
  - **Winner alert**: "Red Sox did it! Final: Red Sox 13, Yankees 4."
  - **Final score**: "Final - Red Sox 11, Yankees 4."
- [ ] **4.9** Alert deduplication — `alert_log` table prevents repeat messages per game per event type
- [ ] **4.10** SMS opt-in flow — phone number, team preference, threshold setting, consent checkbox with timestamp, STOP handler

**Note:** Once Cloudflare Zero Trust auth is live (see "Soon" section), SMS becomes beautifully personalized:
  - Member logs in → app knows their email → looks up their profile → sees their assigned team + any "hearted" favorite teams
  - SMS alerts fire only for that member's specific teams (both assigned + hearts)
  - No more generic broadcast alerts — each member gets notifications for *their* teams
  - Simplifies opt-in flow: preferences are tied to authenticated identity, not a stored choice

### Bigger Features
- [ ] Day-of-week chart on team page
- [ ] Payout UI — cleaner history, better recording flow
- [ ] Onboarding flow for new leagues (commissioner sign-up, league creation)

---

## 📅 Annual Seasonal Lifecycle

The league runs on a fixed calendar. Every phase has a defined start trigger, a set of actions, and a clear handoff to the next phase.

---

### Phase 1 — Regular Season
**~March 25 → ~October 5**

- Weekly cycle: Monday settlements (commissioner settles prior week via admin)
- Push cron runs every 5 min during game hours detecting 13-run finals → auto-records to `game_results`, fires push notifications
- Weekly recap email (Sunday): winner card / rollover card, commissioner's note, standings, streak narratives
- Streaks (win drought) run live — `recalculateStreaks` is called on every week settlement
- Pot accumulates; rollover preserved when no winner

---

### Phase 2 — End of Season
**~October 5 (final regular-season game)**

Trigger: Commissioner manually marks the season closed (or auto-detect: last scheduled game finalized).

Actions:
- Final weekly settlement + final recap email
- Season summary email — all-time rankings snapshot, final payout tally, "see you next year" message
- **Return survey embedded in the email** — one-click RSVP:
  - ✅ **I'm in** — locks them in for next year
  - ❌ **I'm out** — marks them as alumni (soft deactivate at season start)
  - 🤔 **Maybe** — keeps them on the list, commissioner follows up in January
- Payment option in the email — members can pre-pay their buy-in for next season (Venmo/cash, manually tracked in admin)
- Streaks freeze at end of season — `currentGlobal` is capped at the final week of the season so offseason weeks don't inflate drought counters

Implementation needed:
- [ ] `season_status` flag on `leagues` table (`active` / `offseason` / `preseason`)
- [ ] End-of-season summary email template
- [ ] RSVP tracking column on `members` table (`next_season_status`: `in` / `out` / `maybe` / `pending`)
- [ ] Admin UI: show RSVP responses, override individually

---

### Phase 3 — Offseason
**~October 5 → February 13**

- No weekly settlements, no streak movement
- Commissioner can view RSVP status and send follow-up emails to `maybe` responders in January
- New member invites go out — waitlist gets contacted, slots filled from `out` responses
- Pre-payments can be recorded manually in admin
- `GlobalSeasonBanner` shows offseason state + countdown to Draft Day (February 13)

---

### Phase 4 — Draft Day
**February 13 (fixed, annually)**

Draft day is the anchor for the pre-season. Set in stone: **February 13**.

Workflow:
1. Commissioner locks the roster — all `in` members finalized; `out` members marked alumni
2. New members added (replacing outs) before draft executes
3. Draft runs (existing `draft_sessions` / `draft_picks` system — random-assign or double-blind)
4. Teams assigned, `assigned_team` updated on each member
5. Draft Day email → each member receives their team assignment with team blurb
6. Payments collected (those who haven't pre-paid) — tracked in admin

Implementation needed:
- [ ] Roster lock mechanism — prevent team changes after draft
- [ ] Draft Day email template (team assignment + blurb)
- [ ] `draft_year` column on `draft_sessions` so multiple seasons co-exist cleanly
- [ ] Admin: "Close Season" → triggers offseason state and sends end-of-season email
- [ ] Admin: "Open Draft" → unlocks draft UI, sends invites to new members

---

### Phase 5 — Spring Training / Pre-Season
**February 13 → March 25**

- Roster is set, teams assigned
- Members who haven't paid are nudged via email / admin UI
- `GlobalSeasonBanner` shows Spring Training state with countdown to Opening Day (March 25)
- No streak movement, no weekly settlements
- Commissioner can send a "get hyped" email in early March

---

### Phase 6 — Opening Day
**March 25**

- `season_status` flips to `active`
- Banner switches to "Season is live · Week 1"
- Week 1 pot initialized
- Push cron resumes monitoring
- Streak clock resumes from where it was capped at end of last season

---

### Annual Calendar Summary

| Date | Event |
|------|-------|
| ~Oct 5 | Last regular-season game — season ends |
| Oct (week of) | Final recap + season summary email with RSVP survey |
| Oct–Jan | Offseason — streaks frozen, maybe-follows in January |
| **Feb 13** | **Draft Day** — roster locked, teams assigned, draft email sent |
| Feb 13 – Mar 25 | Spring Training — payments collected, hype builds |
| **Mar 25** | **Opening Day** — Week 1 begins |
| Mar 25 – Oct 5 | Regular Season — weekly settlements, recap emails, live push alerts |

---

## 💰 Monetization Strategy

### The Prime Directive
**The platform never touches member money.** Payouts stay peer-to-peer (Venmo, cash, whatever). The moment the platform holds funds and takes a cut, it's a gambling operation requiring state-by-state licenses. Don't do that. Sell the tool, not the book.

### Tier 1 — Do It Now (zero legal risk, low effort)
- [ ] **MLB Shop affiliate links** — weekly email merch pick per featured owner. 5-8% commission via Fanatics/MLB Shop affiliate program (Impact or CJ Affiliate network)
- [ ] **New Era / Fanatics affiliate** — hat of the week, tied to the winner's team
- [ ] **Amazon Associates** — baseball equipment, scorebooks, anything adjacent
- [ ] **Weekly merch feature in recap email** — rotate spotlight to winner, near-miss owner, or commissioner's pick. Affiliate link auto-generated by team.

### Tier 2 — SaaS Commissioner Fees (clean, scalable)
- [ ] Commissioners pay a flat fee per season to run a league ($20–50/season)
- [ ] Platform is a tool, not a gambling operator — no house edge, no fund holding
- [ ] Free tier: 1 private league, manual everything. Paid tier: unlimited leagues, automated emails, SMS alerts, historical stats
- [ ] Onboarding flow required first (see Bigger Features)

### Tier 3 — Content & Sponsorship
- [ ] **Sponsored weekly recap** — a baseball brand (New Era, local bar, baseball card shop) sponsors the email blast. "This week's recap brought to you by..."
- [ ] **Data licensing** — the retrosheet 13-run dataset (1901–present) is genuinely unique. Sports media, betting analytics firms, or academic researchers might pay for access
- [ ] **Premium stats tier** — deeper historical analytics, probability tools, custom exports for power users

### Tier 4 — Long Game (needs scale first)
- [ ] White label for other pool communities — March Madness brackets, NFL squares, hockey pools. Same SaaS model, different sport skin
- [ ] Multi-league directory — public league discovery, waitlist management for popular leagues
- [ ] **Note on Stripe Connect:** If ever handling money (dues collection, automated payouts), consult a lawyer first. Money transmitter laws vary by state. Stripe shields some liability but doesn't eliminate it.
  - Fee model options: per-league SaaS, % of transaction, or both

---

## Architecture Notes

- `historical_results.member_name` is a plain string — no FK to `members.id`
  - Rename RPC is safe for unique names; ambiguous for two people sharing a name
  - Mitigation: disambiguate at entry time (e.g. "Chris W. (2)")
  - Long-term fix: add `member_id` FK column to `historical_results` (backfill by name match)
- Supabase free tier has a row-return cap — always use RPC for aggregations
- `is_active` defaults to `true`; alumni = `is_active = false` (never hard-deleted)
- Co-owners: two members with same `assigned_team` value — team wins split one share by house rules
- Vercel Pro plan: $20/month included credits; build minutes are the main cost driver — batch pushes
