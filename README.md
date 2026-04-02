# 13 Run League

Web app for the **13 Run League**: members draft MLB teams; if a team scores **exactly 13 runs** in a game, that week’s pot pays out. Public pages cover today’s probabilities and history; password-protected league dashboards cover members, payouts, and admin tools.

## Stack

- **Next.js** (App Router), React, Tailwind CSS  
- **Supabase** (data + auth for leagues)  
- **MLB Stats API** (schedule, live linescores, team stats)  
- **Resend / Twilio / web-push** (messaging — sending is gated; see `CLAUDE.md`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in secrets
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build`, `npm run lint`, `npm run seed`, `npm run seed:retrosheet`.

---

## P(13): what the number means

**P(13)** is the probability that **a given team’s final run total for that game is exactly 13** (not 12, not 14).

- **Before first pitch:** Per-team Poisson using season run rates, park factor, and the opposing starter’s ERA adjustment (`buildLambda` → `calculateThirteenProbability` in `src/lib/probability.ts`).
- **During a live game:** **Conditional** probability from the current score and inning. The app prefers a **Retrosheet-derived lookup** (`src/data/thirteen_lookup.json`); if there is no bucket with enough sample size, it falls back to a simpler Poisson remainder (`getConditionalProbability`).
- **After the game is final:** Effectively **100%** if that team scored 13, **0%** otherwise.

Shared helper for **both teams** from the same linescore snapshot:

- `getLiveConditionalProbs(...)` in `src/lib/probability.ts` — single source of truth for live conditional P(13) given away runs, home runs, inning, top/bottom, and each team’s adjusted λ.

---

## Homepage: Live 13-Watch vs Live Rankings

These two modules are meant to show the **same** notion of P(13) for live games.

| Module | Behavior |
|--------|----------|
| **Live 13-Watch** | Games where either team has **≥ 9 runs**. Uses linescore data + `getLiveConditionalProbs`. `LiveWatchCard` polls the feed and recomputes with the same helper so client state matches the model. |
| **Live Rankings** | All of today’s games in a sortable table. **Live** rows use the **same** `getLiveConditionalProbs` inputs as Live 13-Watch (scores and inning from the live feed when available). **Preview** rows use per-team pre-game `calculateThirteenProbability` (not a split of combined “either team” probability). **Final** rows use 0 or 1 as above. |

Game **sort order** on the homepage still uses pre-game **combined** game probability (`gameThirteenProbability`) for ordering matchups; per-cell P(13) follows the table above.

---

## Useful paths

| Area | Location |
|------|----------|
| Probability engine + live helper | `src/lib/probability.ts` |
| Retrosheet lookup table | `src/data/thirteen_lookup.json` |
| Homepage (schedule, live feeds, rankings data) | `src/app/page.tsx` |
| Live rankings UI | `src/components/LiveRankTable.tsx` |
| Live watch cards + polling | `src/components/LiveWatchCard.tsx` |

Product backlog and seasonal notes: **`ROADMAP.md`**. Agent rules (email/SMS, copy constraints): **`CLAUDE.md`**.

---

## Learn More (Next.js)

This project started from [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). See [Next.js documentation](https://nextjs.org/docs) and [deployment](https://nextjs.org/docs/app/building-your-application/deploying).
