/** Precomputed consecutive calendar-day streaks with a 13-run MLB game.
 *  Source: Retrosheet regular-season game logs (1871–2025) + MLB Stats API (2026).
 *  A day counts if any team scored exactly 13 runs.
 */
export const CONSECUTIVE_AS_OF = '2026-08-27'

export type EraKey = 'all' | 'modern'

export type ConsecutiveGame = {
  date: string
  score: string
  team: string
}

export type ConsecutiveStreak = {
  length: number
  start: string
  end: string
  year: number
  games: ConsecutiveGame[]
}

export type EraStats = {
  games: number
  dates: number
  byLen: Record<string, number>
  ge3: number
  ge4: number
  exactly3: number
  exactly4: number
  exactly5: number
  decades: Record<string, number>
}

export const ERA_STATS: Record<EraKey, EraStats> = {
  all: {
  "games": 3757,
  "dates": 3462,
  "byLen": {
    "1": 2499,
    "2": 357,
    "3": 60,
    "4": 11,
    "5": 5
  },
  "ge3": 76,
  "ge4": 16,
  "exactly3": 60,
  "exactly4": 11,
  "exactly5": 5,
  "decades": {
    "1870": 1,
    "1880": 5,
    "1890": 10,
    "1900": 3,
    "1910": 1,
    "1920": 4,
    "1930": 5,
    "1940": 2,
    "1950": 2,
    "1960": 2,
    "1970": 1,
    "1980": 1,
    "1990": 16,
    "2000": 7,
    "2010": 8,
    "2020": 8
  }
},
  modern: {
  "games": 2975,
  "dates": 2746,
  "byLen": {
    "1": 1998,
    "2": 276,
    "3": 47,
    "4": 10,
    "5": 3
  },
  "ge3": 60,
  "ge4": 13,
  "exactly3": 47,
  "exactly4": 10,
  "exactly5": 3,
  "decades": {
    "1900": 3,
    "1910": 1,
    "1920": 4,
    "1930": 5,
    "1940": 2,
    "1950": 2,
    "1960": 2,
    "1970": 1,
    "1980": 1,
    "1990": 16,
    "2000": 7,
    "2010": 8,
    "2020": 8
  }
},
}

export const CONSECUTIVE_STREAKS: ConsecutiveStreak[] = [
  {
    "length": 5,
    "start": "1890-09-01",
    "end": "1890-09-05",
    "year": 1890,
    "games": [
      {
        "date": "1890-09-01",
        "score": "Chi. Pirates 13–1 Bkn. Wonders",
        "team": "Chi. Pirates"
      },
      {
        "date": "1890-09-02",
        "score": "Pit. Burghers 8–13 Phi. Quakers",
        "team": "Phi. Quakers"
      },
      {
        "date": "1890-09-03",
        "score": "Braves (Bos) 4–13 Dodgers (Bkn)",
        "team": "Dodgers (Bkn)"
      },
      {
        "date": "1890-09-04",
        "score": "StL Browns (AA) 13–6 Syracuse",
        "team": "StL Browns (AA)"
      },
      {
        "date": "1890-09-05",
        "score": "Cle. Infants 5–13 Buf. Bisons",
        "team": "Buf. Bisons"
      }
    ]
  },
  {
    "length": 5,
    "start": "1894-07-27",
    "end": "1894-07-31",
    "year": 1894,
    "games": [
      {
        "date": "1894-07-27",
        "score": "Giants (NY) 5–13 Phillies",
        "team": "Phillies"
      },
      {
        "date": "1894-07-28",
        "score": "Cubs 13–19 Reds",
        "team": "Cubs"
      },
      {
        "date": "1894-07-29",
        "score": "Louisville 2–13 Cardinals",
        "team": "Cardinals"
      },
      {
        "date": "1894-07-30",
        "score": "Giants (NY) 13–7 Phillies",
        "team": "Giants (NY)"
      },
      {
        "date": "1894-07-31",
        "score": "Dodgers (Bkn) 6–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 5,
    "start": "1996-08-04",
    "end": "1996-08-08",
    "year": 1996,
    "games": [
      {
        "date": "1996-08-04",
        "score": "Twins 6–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1996-08-05",
        "score": "Orioles 13–10 Cleveland",
        "team": "Orioles"
      },
      {
        "date": "1996-08-05",
        "score": "Brewers 13–3 Athletics",
        "team": "Brewers"
      },
      {
        "date": "1996-08-06",
        "score": "Orioles 13–3 Brewers",
        "team": "Orioles"
      },
      {
        "date": "1996-08-07",
        "score": "Expos 13–5 Astros",
        "team": "Expos"
      },
      {
        "date": "1996-08-08",
        "score": "Twins 13–5 Angels",
        "team": "Twins"
      }
    ]
  },
  {
    "length": 5,
    "start": "1998-04-06",
    "end": "1998-04-10",
    "year": 1998,
    "games": [
      {
        "date": "1998-04-06",
        "score": "Rockies 4–13 Astros",
        "team": "Astros"
      },
      {
        "date": "1998-04-07",
        "score": "Yankees 13–7 Mariners",
        "team": "Yankees"
      },
      {
        "date": "1998-04-08",
        "score": "Cardinals 13–9 Rockies",
        "team": "Cardinals"
      },
      {
        "date": "1998-04-09",
        "score": "Blue Jays 2–13 Twins",
        "team": "Twins"
      },
      {
        "date": "1998-04-10",
        "score": "Athletics 13–17 Yankees",
        "team": "Athletics"
      },
      {
        "date": "1998-04-10",
        "score": "Cubs 13–0 Expos",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 5,
    "start": "2021-08-25",
    "end": "2021-08-29",
    "year": 2021,
    "games": [
      {
        "date": "2021-08-25",
        "score": "Rockies 13–10 Cubs",
        "team": "Rockies"
      },
      {
        "date": "2021-08-26",
        "score": "Angels 1–13 Orioles",
        "team": "Orioles"
      },
      {
        "date": "2021-08-27",
        "score": "Cubs 13–17 White Sox",
        "team": "Cubs"
      },
      {
        "date": "2021-08-28",
        "score": "Cardinals 13–0 Pirates",
        "team": "Cardinals"
      },
      {
        "date": "2021-08-29",
        "score": "Cubs 1–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "2021-08-29",
        "score": "Astros 2–13 Rangers",
        "team": "Rangers"
      }
    ]
  },
  {
    "length": 4,
    "start": "1899-06-02",
    "end": "1899-06-05",
    "year": 1899,
    "games": [
      {
        "date": "1899-06-02",
        "score": "Louisville 12–13 Giants (NY)",
        "team": "Giants (NY)"
      },
      {
        "date": "1899-06-03",
        "score": "Cleveland (NL) 4–13 Dodgers (Bkn)",
        "team": "Dodgers (Bkn)"
      },
      {
        "date": "1899-06-04",
        "score": "Louisville 2–13 Giants (NY)",
        "team": "Giants (NY)"
      },
      {
        "date": "1899-06-05",
        "score": "Pirates 3–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 4,
    "start": "1935-08-26",
    "end": "1935-08-29",
    "year": 1935,
    "games": [
      {
        "date": "1935-08-26",
        "score": "Athletics (Phi) 7–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1935-08-27",
        "score": "Yankees 13–10 White Sox",
        "team": "Yankees"
      },
      {
        "date": "1935-08-28",
        "score": "Cardinals 13–5 Phillies",
        "team": "Cardinals"
      },
      {
        "date": "1935-08-29",
        "score": "Tigers 13–3 Browns",
        "team": "Tigers"
      }
    ]
  },
  {
    "length": 4,
    "start": "1940-07-25",
    "end": "1940-07-28",
    "year": 1940,
    "games": [
      {
        "date": "1940-07-25",
        "score": "Yankees 13–8 Browns",
        "team": "Yankees"
      },
      {
        "date": "1940-07-26",
        "score": "Senators 2–13 Cleveland",
        "team": "Cleveland"
      },
      {
        "date": "1940-07-27",
        "score": "Red Sox 5–13 Browns",
        "team": "Browns"
      },
      {
        "date": "1940-07-28",
        "score": "Red Sox 13–10 Browns",
        "team": "Red Sox"
      }
    ]
  },
  {
    "length": 4,
    "start": "1994-07-18",
    "end": "1994-07-21",
    "year": 1994,
    "games": [
      {
        "date": "1994-07-18",
        "score": "Red Sox 4–13 Angels",
        "team": "Angels"
      },
      {
        "date": "1994-07-19",
        "score": "Marlins 5–13 Reds",
        "team": "Reds"
      },
      {
        "date": "1994-07-19",
        "score": "Braves 10–13 Pirates",
        "team": "Pirates"
      },
      {
        "date": "1994-07-20",
        "score": "Rangers 13–11 Cleveland",
        "team": "Rangers"
      },
      {
        "date": "1994-07-21",
        "score": "Pirates 6–13 Astros",
        "team": "Astros"
      }
    ]
  },
  {
    "length": 4,
    "start": "1999-06-19",
    "end": "1999-06-22",
    "year": 1999,
    "games": [
      {
        "date": "1999-06-19",
        "score": "Athletics 13–1 Tigers",
        "team": "Athletics"
      },
      {
        "date": "1999-06-20",
        "score": "Mariners 5–13 Cleveland",
        "team": "Cleveland"
      },
      {
        "date": "1999-06-21",
        "score": "Athletics 11–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1999-06-22",
        "score": "Cubs 13–12 Rockies",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 4,
    "start": "2001-07-04",
    "end": "2001-07-07",
    "year": 2001,
    "games": [
      {
        "date": "2001-07-04",
        "score": "Red Sox 13–4 Cleveland",
        "team": "Red Sox"
      },
      {
        "date": "2001-07-05",
        "score": "Cubs 13–4 Mets",
        "team": "Cubs"
      },
      {
        "date": "2001-07-06",
        "score": "Mariners 13–0 Dodgers",
        "team": "Mariners"
      },
      {
        "date": "2001-07-07",
        "score": "Brewers 13–3 Giants",
        "team": "Brewers"
      }
    ]
  },
  {
    "length": 4,
    "start": "2003-06-05",
    "end": "2003-06-08",
    "year": 2003,
    "games": [
      {
        "date": "2003-06-05",
        "score": "Blue Jays 5–13 Cardinals",
        "team": "Cardinals"
      },
      {
        "date": "2003-06-06",
        "score": "Rangers 10–13 Expos",
        "team": "Expos"
      },
      {
        "date": "2003-06-07",
        "score": "Royals 13–11 Rockies",
        "team": "Royals"
      },
      {
        "date": "2003-06-08",
        "score": "Cleveland 3–13 D-backs",
        "team": "D-backs"
      },
      {
        "date": "2003-06-08",
        "score": "Mariners 13–1 Mets",
        "team": "Mariners"
      }
    ]
  },
  {
    "length": 4,
    "start": "2003-06-26",
    "end": "2003-06-29",
    "year": 2003,
    "games": [
      {
        "date": "2003-06-26",
        "score": "Athletics 13–0 Rangers",
        "team": "Athletics"
      },
      {
        "date": "2003-06-26",
        "score": "Orioles 8–13 Blue Jays",
        "team": "Blue Jays"
      },
      {
        "date": "2003-06-27",
        "score": "Brewers 13–1 Twins",
        "team": "Brewers"
      },
      {
        "date": "2003-06-28",
        "score": "Cardinals 13–9 Royals",
        "team": "Cardinals"
      },
      {
        "date": "2003-06-29",
        "score": "Cardinals 13–6 Royals",
        "team": "Cardinals"
      }
    ]
  },
  {
    "length": 4,
    "start": "2008-08-16",
    "end": "2008-08-19",
    "year": 2008,
    "games": [
      {
        "date": "2008-08-16",
        "score": "Rockies 13–6 Nationals",
        "team": "Rockies"
      },
      {
        "date": "2008-08-17",
        "score": "White Sox 13–1 Athletics",
        "team": "White Sox"
      },
      {
        "date": "2008-08-18",
        "score": "Mariners 5–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "2008-08-19",
        "score": "Athletics 2–13 Twins",
        "team": "Twins"
      }
    ]
  },
  {
    "length": 4,
    "start": "2019-06-28",
    "end": "2019-07-01",
    "year": 2019,
    "games": [
      {
        "date": "2019-06-28",
        "score": "Dodgers 9–13 Rockies",
        "team": "Rockies"
      },
      {
        "date": "2019-06-28",
        "score": "Cleveland 0–13 Orioles",
        "team": "Orioles"
      },
      {
        "date": "2019-06-29",
        "score": "Cleveland 0–13 Orioles",
        "team": "Orioles"
      },
      {
        "date": "2019-06-29",
        "score": "Yankees 17–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "2019-06-30",
        "score": "Phillies 13–6 Marlins",
        "team": "Phillies"
      },
      {
        "date": "2019-07-01",
        "score": "Giants 13–2 Padres",
        "team": "Giants"
      }
    ]
  },
  {
    "length": 4,
    "start": "2026-08-24",
    "end": "2026-08-27",
    "year": 2026,
    "games": [
      {
        "date": "2026-08-24",
        "score": "Rockies 3–13 Nationals",
        "team": "Nationals"
      },
      {
        "date": "2026-08-25",
        "score": "Orioles 13–1 Cardinals",
        "team": "Orioles"
      },
      {
        "date": "2026-08-26",
        "score": "Rockies 13–1 Nationals",
        "team": "Rockies"
      },
      {
        "date": "2026-08-27",
        "score": "Royals 13–2 Blue Jays",
        "team": "Royals"
      }
    ]
  },
  {
    "length": 3,
    "start": "1873-07-03",
    "end": "1873-07-05",
    "year": 1873,
    "games": [
      {
        "date": "1873-07-03",
        "score": "Baltimore (NA) 3–13 Philadelphia (NA)",
        "team": "Philadelphia (NA)"
      },
      {
        "date": "1873-07-04",
        "score": "Philadelphia (NA) 13–12 Baltimore (NA)",
        "team": "Philadelphia (NA)"
      },
      {
        "date": "1873-07-05",
        "score": "Elizabeth 2–13 Boston (NA)",
        "team": "Boston (NA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1883-07-17",
    "end": "1883-07-19",
    "year": 1883,
    "games": [
      {
        "date": "1883-07-17",
        "score": "Philadelphia (AA) 13–9 Baltimore (AA)",
        "team": "Philadelphia (AA)"
      },
      {
        "date": "1883-07-18",
        "score": "Providence 13–5 Detroit (NL)",
        "team": "Providence"
      },
      {
        "date": "1883-07-19",
        "score": "Cincinnati (AA) 7–13 StL Browns (AA)",
        "team": "StL Browns (AA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1885-09-29",
    "end": "1885-10-01",
    "year": 1885,
    "games": [
      {
        "date": "1885-09-29",
        "score": "Providence 1–13 Detroit (NL)",
        "team": "Detroit (NL)"
      },
      {
        "date": "1885-09-30",
        "score": "StL Browns (AA) 5–13 Brooklyn (AA)",
        "team": "Brooklyn (AA)"
      },
      {
        "date": "1885-10-01",
        "score": "Louisville (AA) 8–13 Baltimore (AA)",
        "team": "Baltimore (AA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1886-07-29",
    "end": "1886-07-31",
    "year": 1886,
    "games": [
      {
        "date": "1886-07-29",
        "score": "KC Cowboys 2–13 Phillies",
        "team": "Phillies"
      },
      {
        "date": "1886-07-29",
        "score": "Detroit (NL) 13–1 Washington (NL)",
        "team": "Detroit (NL)"
      },
      {
        "date": "1886-07-30",
        "score": "Detroit (NL) 13–9 Washington (NL)",
        "team": "Detroit (NL)"
      },
      {
        "date": "1886-07-31",
        "score": "StL Browns (AA) 13–4 Philadelphia (AA)",
        "team": "StL Browns (AA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1887-05-23",
    "end": "1887-05-25",
    "year": 1887,
    "games": [
      {
        "date": "1887-05-23",
        "score": "Philadelphia (AA) 13–6 Cleveland (AA)",
        "team": "Philadelphia (AA)"
      },
      {
        "date": "1887-05-24",
        "score": "Philadelphia (AA) 13–12 Cleveland (AA)",
        "team": "Philadelphia (AA)"
      },
      {
        "date": "1887-05-25",
        "score": "Baltimore (AA) 13–7 Cleveland (AA)",
        "team": "Baltimore (AA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1889-05-28",
    "end": "1889-05-30",
    "year": 1889,
    "games": [
      {
        "date": "1889-05-28",
        "score": "Louisville (AA) 12–13 Cincinnati (AA)",
        "team": "Cincinnati (AA)"
      },
      {
        "date": "1889-05-29",
        "score": "Pirates 4–13 Phillies",
        "team": "Phillies"
      },
      {
        "date": "1889-05-30",
        "score": "Pirates 6–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 3,
    "start": "1891-06-15",
    "end": "1891-06-17",
    "year": 1891,
    "games": [
      {
        "date": "1891-06-15",
        "score": "Reds 13–9 Dodgers (Bkn)",
        "team": "Reds"
      },
      {
        "date": "1891-06-15",
        "score": "Cubs 13–14 Giants (NY)",
        "team": "Cubs"
      },
      {
        "date": "1891-06-16",
        "score": "Boston (AA) 13–4 Philadelphia (AA)",
        "team": "Boston (AA)"
      },
      {
        "date": "1891-06-17",
        "score": "Philadelphia (AA) 13–11 Boston (AA)",
        "team": "Philadelphia (AA)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1893-05-24",
    "end": "1893-05-26",
    "year": 1893,
    "games": [
      {
        "date": "1893-05-24",
        "score": "Cleveland (NL) 5–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1893-05-25",
        "score": "Phillies 6–13 Giants (NY)",
        "team": "Giants (NY)"
      },
      {
        "date": "1893-05-26",
        "score": "Nationals (19c) 12–13 Braves (Bos)",
        "team": "Braves (Bos)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1894-07-04",
    "end": "1894-07-06",
    "year": 1894,
    "games": [
      {
        "date": "1894-07-04",
        "score": "Dodgers (Bkn) 8–13 Reds",
        "team": "Reds"
      },
      {
        "date": "1894-07-04",
        "score": "Braves (Bos) 11–13 Pirates",
        "team": "Pirates"
      },
      {
        "date": "1894-07-05",
        "score": "Nationals (19c) 10–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1894-07-05",
        "score": "Dodgers (Bkn) 12–13 Cardinals",
        "team": "Cardinals"
      },
      {
        "date": "1894-07-06",
        "score": "Phillies 13–7 Pirates",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 3,
    "start": "1894-07-09",
    "end": "1894-07-11",
    "year": 1894,
    "games": [
      {
        "date": "1894-07-09",
        "score": "Braves (Bos) 11–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1894-07-09",
        "score": "Giants (NY) 13–6 Reds",
        "team": "Giants (NY)"
      },
      {
        "date": "1894-07-10",
        "score": "Dodgers (Bkn) 7–13 Louisville",
        "team": "Louisville"
      },
      {
        "date": "1894-07-11",
        "score": "Braves (Bos) 1–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1894-07-11",
        "score": "Phillies 12–13 Cardinals",
        "team": "Cardinals"
      }
    ]
  },
  {
    "length": 3,
    "start": "1896-07-06",
    "end": "1896-07-08",
    "year": 1896,
    "games": [
      {
        "date": "1896-07-06",
        "score": "Orioles (NL) 14–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1896-07-07",
        "score": "Orioles (NL) 11–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1896-07-08",
        "score": "Orioles (NL) 15–13 Cubs",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 3,
    "start": "1896-09-24",
    "end": "1896-09-26",
    "year": 1896,
    "games": [
      {
        "date": "1896-09-24",
        "score": "Louisville 13–7 Cleveland (NL)",
        "team": "Louisville"
      },
      {
        "date": "1896-09-25",
        "score": "Dodgers (Bkn) 4–13 Phillies",
        "team": "Phillies"
      },
      {
        "date": "1896-09-26",
        "score": "Dodgers (Bkn) 13–10 Phillies",
        "team": "Dodgers (Bkn)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1899-08-16",
    "end": "1899-08-18",
    "year": 1899,
    "games": [
      {
        "date": "1899-08-16",
        "score": "Cleveland (NL) 2–13 Dodgers (Bkn)",
        "team": "Dodgers (Bkn)"
      },
      {
        "date": "1899-08-17",
        "score": "Cubs 5–13 Orioles (NL)",
        "team": "Orioles (NL)"
      },
      {
        "date": "1899-08-17",
        "score": "Reds 4–13 Giants (NY)",
        "team": "Giants (NY)"
      },
      {
        "date": "1899-08-18",
        "score": "Cubs 13–12 Orioles (NL)",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 3,
    "start": "1901-04-27",
    "end": "1901-04-29",
    "year": 1901,
    "games": [
      {
        "date": "1901-04-27",
        "score": "Brewers (1901) 9–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1901-04-28",
        "score": "Cleveland 1–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "1901-04-29",
        "score": "Giants (NY) 13–14 Phillies",
        "team": "Giants (NY)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1901-06-08",
    "end": "1901-06-10",
    "year": 1901,
    "games": [
      {
        "date": "1901-06-08",
        "score": "Cleveland 13–5 Yankees",
        "team": "Cleveland"
      },
      {
        "date": "1901-06-09",
        "score": "Giants (NY) 25–13 Reds",
        "team": "Reds"
      },
      {
        "date": "1901-06-10",
        "score": "Cleveland 13–6 Yankees",
        "team": "Cleveland"
      },
      {
        "date": "1901-06-10",
        "score": "White Sox 13–10 Senators",
        "team": "White Sox"
      }
    ]
  },
  {
    "length": 3,
    "start": "1903-05-08",
    "end": "1903-05-10",
    "year": 1903,
    "games": [
      {
        "date": "1903-05-08",
        "score": "Browns 13–12 White Sox",
        "team": "Browns"
      },
      {
        "date": "1903-05-09",
        "score": "Tigers 13–1 Cleveland",
        "team": "Tigers"
      },
      {
        "date": "1903-05-09",
        "score": "Senators 4–13 Athletics (Phi)",
        "team": "Athletics (Phi)"
      },
      {
        "date": "1903-05-10",
        "score": "Cubs 13–8 Cardinals",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 3,
    "start": "1911-05-11",
    "end": "1911-05-13",
    "year": 1911,
    "games": [
      {
        "date": "1911-05-11",
        "score": "Reds 13–10 Braves (Bos)",
        "team": "Reds"
      },
      {
        "date": "1911-05-12",
        "score": "Athletics (Phi) 17–13 Browns",
        "team": "Browns"
      },
      {
        "date": "1911-05-13",
        "score": "Red Sox 13–11 Tigers",
        "team": "Red Sox"
      }
    ]
  },
  {
    "length": 3,
    "start": "1920-07-29",
    "end": "1920-07-31",
    "year": 1920,
    "games": [
      {
        "date": "1920-07-29",
        "score": "Senators 3–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1920-07-30",
        "score": "Red Sox 4–13 Cleveland",
        "team": "Cleveland"
      },
      {
        "date": "1920-07-31",
        "score": "Yankees 8–13 Browns",
        "team": "Browns"
      }
    ]
  },
  {
    "length": 3,
    "start": "1925-05-27",
    "end": "1925-05-29",
    "year": 1925,
    "games": [
      {
        "date": "1925-05-27",
        "score": "Cubs 3–13 Pirates",
        "team": "Pirates"
      },
      {
        "date": "1925-05-28",
        "score": "Cubs 13–3 Reds",
        "team": "Cubs"
      },
      {
        "date": "1925-05-29",
        "score": "Tigers 13–9 White Sox",
        "team": "Tigers"
      }
    ]
  },
  {
    "length": 3,
    "start": "1929-05-10",
    "end": "1929-05-12",
    "year": 1929,
    "games": [
      {
        "date": "1929-05-10",
        "score": "Pirates 13–9 Phillies",
        "team": "Pirates"
      },
      {
        "date": "1929-05-11",
        "score": "Yankees 7–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1929-05-12",
        "score": "Cardinals 13–7 Dodgers (Bkn)",
        "team": "Cardinals"
      }
    ]
  },
  {
    "length": 3,
    "start": "1929-06-17",
    "end": "1929-06-19",
    "year": 1929,
    "games": [
      {
        "date": "1929-06-17",
        "score": "Cardinals 13–3 Cubs",
        "team": "Cardinals"
      },
      {
        "date": "1929-06-18",
        "score": "Cardinals 6–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1929-06-19",
        "score": "Red Sox 2–13 Yankees",
        "team": "Yankees"
      }
    ]
  },
  {
    "length": 3,
    "start": "1930-07-18",
    "end": "1930-07-20",
    "year": 1930,
    "games": [
      {
        "date": "1930-07-18",
        "score": "Reds 13–6 Phillies",
        "team": "Reds"
      },
      {
        "date": "1930-07-19",
        "score": "Yankees 13–7 Browns",
        "team": "Yankees"
      },
      {
        "date": "1930-07-20",
        "score": "Reds 1–13 Braves (Bos)",
        "team": "Braves (Bos)"
      },
      {
        "date": "1930-07-20",
        "score": "Cubs 5–13 Giants (NY)",
        "team": "Giants (NY)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1936-05-22",
    "end": "1936-05-24",
    "year": 1936,
    "games": [
      {
        "date": "1936-05-22",
        "score": "Tigers 13–10 Cleveland",
        "team": "Tigers"
      },
      {
        "date": "1936-05-23",
        "score": "Tigers 13–5 Cleveland",
        "team": "Tigers"
      },
      {
        "date": "1936-05-24",
        "score": "Phillies 5–13 Giants (NY)",
        "team": "Giants (NY)"
      }
    ]
  },
  {
    "length": 3,
    "start": "1938-08-11",
    "end": "1938-08-13",
    "year": 1938,
    "games": [
      {
        "date": "1938-08-11",
        "score": "Tigers 1–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "1938-08-12",
        "score": "Red Sox 1–13 Senators",
        "team": "Senators"
      },
      {
        "date": "1938-08-13",
        "score": "Cleveland 13–4 White Sox",
        "team": "Cleveland"
      }
    ]
  },
  {
    "length": 3,
    "start": "1939-07-16",
    "end": "1939-07-18",
    "year": 1939,
    "games": [
      {
        "date": "1939-07-16",
        "score": "Athletics (Phi) 7–13 Browns",
        "team": "Browns"
      },
      {
        "date": "1939-07-17",
        "score": "Red Sox 6–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1939-07-18",
        "score": "Red Sox 13–10 White Sox",
        "team": "Red Sox"
      }
    ]
  },
  {
    "length": 3,
    "start": "1947-08-19",
    "end": "1947-08-21",
    "year": 1947,
    "games": [
      {
        "date": "1947-08-19",
        "score": "Senators 2–13 Cleveland",
        "team": "Cleveland"
      },
      {
        "date": "1947-08-20",
        "score": "Yankees 14–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1947-08-21",
        "score": "Cardinals 13–3 Phillies",
        "team": "Cardinals"
      }
    ]
  },
  {
    "length": 3,
    "start": "1950-07-14",
    "end": "1950-07-16",
    "year": 1950,
    "games": [
      {
        "date": "1950-07-14",
        "score": "White Sox 1–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1950-07-15",
        "score": "Dodgers (Bkn) 13–5 Cubs",
        "team": "Dodgers (Bkn)"
      },
      {
        "date": "1950-07-16",
        "score": "Cleveland 10–13 Red Sox",
        "team": "Red Sox"
      }
    ]
  },
  {
    "length": 3,
    "start": "1953-07-27",
    "end": "1953-07-29",
    "year": 1953,
    "games": [
      {
        "date": "1953-07-27",
        "score": "Giants (NY) 0–13 Braves (Mil)",
        "team": "Braves (Mil)"
      },
      {
        "date": "1953-07-28",
        "score": "Dodgers (Bkn) 13–2 Cubs",
        "team": "Dodgers (Bkn)"
      },
      {
        "date": "1953-07-29",
        "score": "Tigers 5–13 Senators",
        "team": "Senators"
      },
      {
        "date": "1953-07-29",
        "score": "Phillies 4–13 Reds",
        "team": "Reds"
      }
    ]
  },
  {
    "length": 3,
    "start": "1966-08-11",
    "end": "1966-08-13",
    "year": 1966,
    "games": [
      {
        "date": "1966-08-11",
        "score": "Cleveland 3–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1966-08-12",
        "score": "Tigers 9–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1966-08-13",
        "score": "Tigers 13–1 Red Sox",
        "team": "Tigers"
      }
    ]
  },
  {
    "length": 3,
    "start": "1969-07-04",
    "end": "1969-07-06",
    "year": 1969,
    "games": [
      {
        "date": "1969-07-04",
        "score": "Pilots 2–13 Royals",
        "team": "Royals"
      },
      {
        "date": "1969-07-05",
        "score": "Athletics 1–13 Twins",
        "team": "Twins"
      },
      {
        "date": "1969-07-06",
        "score": "Expos 2–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 3,
    "start": "1974-08-04",
    "end": "1974-08-06",
    "year": 1974,
    "games": [
      {
        "date": "1974-08-04",
        "score": "Rangers 10–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "1974-08-05",
        "score": "Rangers 13–8 White Sox",
        "team": "Rangers"
      },
      {
        "date": "1974-08-06",
        "score": "Astros 13–4 Giants",
        "team": "Astros"
      }
    ]
  },
  {
    "length": 3,
    "start": "1980-09-19",
    "end": "1980-09-21",
    "year": 1980,
    "games": [
      {
        "date": "1980-09-19",
        "score": "Athletics 3–13 Royals",
        "team": "Royals"
      },
      {
        "date": "1980-09-20",
        "score": "Cleveland 3–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "1980-09-21",
        "score": "Cleveland 1–13 Tigers",
        "team": "Tigers"
      }
    ]
  },
  {
    "length": 3,
    "start": "1990-05-18",
    "end": "1990-05-20",
    "year": 1990,
    "games": [
      {
        "date": "1990-05-18",
        "score": "Rangers 1–13 Orioles",
        "team": "Orioles"
      },
      {
        "date": "1990-05-19",
        "score": "Twins 1–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1990-05-20",
        "score": "Pirates 11–13 Braves",
        "team": "Braves"
      }
    ]
  },
  {
    "length": 3,
    "start": "1993-05-12",
    "end": "1993-05-14",
    "year": 1993,
    "games": [
      {
        "date": "1993-05-12",
        "score": "Tigers 13–8 Blue Jays",
        "team": "Tigers"
      },
      {
        "date": "1993-05-13",
        "score": "Giants 13–8 Rockies",
        "team": "Giants"
      },
      {
        "date": "1993-05-14",
        "score": "Rockies 5–13 Reds",
        "team": "Reds"
      }
    ]
  },
  {
    "length": 3,
    "start": "1995-05-09",
    "end": "1995-05-11",
    "year": 1995,
    "games": [
      {
        "date": "1995-05-09",
        "score": "Astros 13–6 Pirates",
        "team": "Astros"
      },
      {
        "date": "1995-05-10",
        "score": "Tigers 2–13 Brewers",
        "team": "Brewers"
      },
      {
        "date": "1995-05-11",
        "score": "Expos 13–1 Phillies",
        "team": "Expos"
      }
    ]
  },
  {
    "length": 3,
    "start": "1995-07-16",
    "end": "1995-07-18",
    "year": 1995,
    "games": [
      {
        "date": "1995-07-16",
        "score": "Angels 13–6 Tigers",
        "team": "Angels"
      },
      {
        "date": "1995-07-17",
        "score": "Athletics 4–13 Brewers",
        "team": "Brewers"
      },
      {
        "date": "1995-07-18",
        "score": "Astros 13–4 Dodgers",
        "team": "Astros"
      }
    ]
  },
  {
    "length": 3,
    "start": "1995-07-21",
    "end": "1995-07-23",
    "year": 1995,
    "games": [
      {
        "date": "1995-07-21",
        "score": "Twins 5–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1995-07-22",
        "score": "Tigers 3–13 Angels",
        "team": "Angels"
      },
      {
        "date": "1995-07-23",
        "score": "Tigers 2–13 Angels",
        "team": "Angels"
      }
    ]
  },
  {
    "length": 3,
    "start": "1996-06-14",
    "end": "1996-06-16",
    "year": 1996,
    "games": [
      {
        "date": "1996-06-14",
        "score": "Mets 4–13 Cardinals",
        "team": "Cardinals"
      },
      {
        "date": "1996-06-15",
        "score": "Rangers 13–3 Red Sox",
        "team": "Rangers"
      },
      {
        "date": "1996-06-16",
        "score": "Orioles 13–5 Royals",
        "team": "Orioles"
      }
    ]
  },
  {
    "length": 3,
    "start": "1996-06-27",
    "end": "1996-06-29",
    "year": 1996,
    "games": [
      {
        "date": "1996-06-27",
        "score": "Dodgers 1–13 Rockies",
        "team": "Rockies"
      },
      {
        "date": "1996-06-28",
        "score": "Dodgers 4–13 Rockies",
        "team": "Rockies"
      },
      {
        "date": "1996-06-29",
        "score": "Tigers 6–13 Red Sox",
        "team": "Red Sox"
      },
      {
        "date": "1996-06-29",
        "score": "Dodgers 13–10 Rockies",
        "team": "Dodgers"
      }
    ]
  },
  {
    "length": 3,
    "start": "1997-04-07",
    "end": "1997-04-09",
    "year": 1997,
    "games": [
      {
        "date": "1997-04-07",
        "score": "Reds 2–13 Rockies",
        "team": "Rockies"
      },
      {
        "date": "1997-04-08",
        "score": "Red Sox 13–7 Athletics",
        "team": "Red Sox"
      },
      {
        "date": "1997-04-09",
        "score": "Reds 4–13 Rockies",
        "team": "Rockies"
      }
    ]
  },
  {
    "length": 3,
    "start": "1998-05-04",
    "end": "1998-05-06",
    "year": 1998,
    "games": [
      {
        "date": "1998-05-04",
        "score": "Padres 13–5 Brewers",
        "team": "Padres"
      },
      {
        "date": "1998-05-05",
        "score": "Blue Jays 13–11 Angels",
        "team": "Blue Jays"
      },
      {
        "date": "1998-05-05",
        "score": "Padres 13–4 Brewers",
        "team": "Padres"
      },
      {
        "date": "1998-05-06",
        "score": "Yankees 15–13 Rangers",
        "team": "Rangers"
      }
    ]
  },
  {
    "length": 3,
    "start": "1999-05-04",
    "end": "1999-05-06",
    "year": 1999,
    "games": [
      {
        "date": "1999-05-04",
        "score": "Athletics 13–4 Blue Jays",
        "team": "Athletics"
      },
      {
        "date": "1999-05-04",
        "score": "Rockies 12–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1999-05-05",
        "score": "Rockies 13–6 Cubs",
        "team": "Rockies"
      },
      {
        "date": "1999-05-06",
        "score": "Pirates 13–3 Cardinals",
        "team": "Pirates"
      }
    ]
  },
  {
    "length": 3,
    "start": "1999-05-17",
    "end": "1999-05-19",
    "year": 1999,
    "games": [
      {
        "date": "1999-05-17",
        "score": "Cleveland 13–9 White Sox",
        "team": "Cleveland"
      },
      {
        "date": "1999-05-17",
        "score": "Rays 13–3 Rangers",
        "team": "Rays"
      },
      {
        "date": "1999-05-18",
        "score": "Cleveland 13–0 White Sox",
        "team": "Cleveland"
      },
      {
        "date": "1999-05-18",
        "score": "Athletics 3–13 Royals",
        "team": "Royals"
      },
      {
        "date": "1999-05-19",
        "score": "Cleveland 13–7 White Sox",
        "team": "Cleveland"
      }
    ]
  },
  {
    "length": 3,
    "start": "1999-06-26",
    "end": "1999-06-28",
    "year": 1999,
    "games": [
      {
        "date": "1999-06-26",
        "score": "Rockies 6–13 Padres",
        "team": "Padres"
      },
      {
        "date": "1999-06-27",
        "score": "Phillies 7–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "1999-06-28",
        "score": "Braves 13–5 Expos",
        "team": "Braves"
      }
    ]
  },
  {
    "length": 3,
    "start": "2000-09-06",
    "end": "2000-09-08",
    "year": 2000,
    "games": [
      {
        "date": "2000-09-06",
        "score": "Marlins 5–13 Astros",
        "team": "Astros"
      },
      {
        "date": "2000-09-06",
        "score": "Rangers 1–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "2000-09-07",
        "score": "Padres 0–13 Giants",
        "team": "Giants"
      },
      {
        "date": "2000-09-08",
        "score": "Astros 13–10 Cubs",
        "team": "Astros"
      }
    ]
  },
  {
    "length": 3,
    "start": "2004-06-23",
    "end": "2004-06-25",
    "year": 2004,
    "games": [
      {
        "date": "2004-06-23",
        "score": "Yankees 2–13 Orioles",
        "team": "Orioles"
      },
      {
        "date": "2004-06-24",
        "score": "Rays 19–13 Blue Jays",
        "team": "Blue Jays"
      },
      {
        "date": "2004-06-25",
        "score": "Angels 13–0 Dodgers",
        "team": "Angels"
      }
    ]
  },
  {
    "length": 3,
    "start": "2008-04-18",
    "end": "2008-04-20",
    "year": 2008,
    "games": [
      {
        "date": "2008-04-18",
        "score": "Royals 2–13 Athletics",
        "team": "Athletics"
      },
      {
        "date": "2008-04-19",
        "score": "Pirates 1–13 Cubs",
        "team": "Cubs"
      },
      {
        "date": "2008-04-20",
        "score": "Pirates 6–13 Cubs",
        "team": "Cubs"
      }
    ]
  },
  {
    "length": 3,
    "start": "2015-06-21",
    "end": "2015-06-23",
    "year": 2015,
    "games": [
      {
        "date": "2015-06-21",
        "score": "Red Sox 13–2 Royals",
        "team": "Red Sox"
      },
      {
        "date": "2015-06-21",
        "score": "Orioles 13–9 Blue Jays",
        "team": "Orioles"
      },
      {
        "date": "2015-06-22",
        "score": "White Sox 2–13 Twins",
        "team": "Twins"
      },
      {
        "date": "2015-06-23",
        "score": "Astros 13–3 Angels",
        "team": "Astros"
      }
    ]
  },
  {
    "length": 3,
    "start": "2015-08-09",
    "end": "2015-08-11",
    "year": 2015,
    "games": [
      {
        "date": "2015-08-09",
        "score": "Dodgers 6–13 Pirates",
        "team": "Pirates"
      },
      {
        "date": "2015-08-10",
        "score": "Phillies 3–13 D-backs",
        "team": "D-backs"
      },
      {
        "date": "2015-08-11",
        "score": "Phillies 1–13 D-backs",
        "team": "D-backs"
      }
    ]
  },
  {
    "length": 3,
    "start": "2016-06-12",
    "end": "2016-06-14",
    "year": 2016,
    "games": [
      {
        "date": "2016-06-12",
        "score": "Cubs 13–2 Braves",
        "team": "Cubs"
      },
      {
        "date": "2016-06-13",
        "score": "Marlins 13–4 Padres",
        "team": "Marlins"
      },
      {
        "date": "2016-06-14",
        "score": "Yankees 10–13 Rockies",
        "team": "Rockies"
      }
    ]
  },
  {
    "length": 3,
    "start": "2016-06-16",
    "end": "2016-06-18",
    "year": 2016,
    "games": [
      {
        "date": "2016-06-16",
        "score": "Blue Jays 13–2 Phillies",
        "team": "Blue Jays"
      },
      {
        "date": "2016-06-17",
        "score": "Blue Jays 13–3 Orioles",
        "team": "Blue Jays"
      },
      {
        "date": "2016-06-18",
        "score": "White Sox 2–13 Cleveland",
        "team": "Cleveland"
      }
    ]
  },
  {
    "length": 3,
    "start": "2017-09-04",
    "end": "2017-09-06",
    "year": 2017,
    "games": [
      {
        "date": "2017-09-04",
        "score": "D-backs 13–0 Dodgers",
        "team": "D-backs"
      },
      {
        "date": "2017-09-05",
        "score": "Royals 2–13 Tigers",
        "team": "Tigers"
      },
      {
        "date": "2017-09-06",
        "score": "Royals 13–2 Tigers",
        "team": "Royals"
      }
    ]
  },
  {
    "length": 3,
    "start": "2019-06-22",
    "end": "2019-06-24",
    "year": 2019,
    "games": [
      {
        "date": "2019-06-22",
        "score": "Braves 13–9 Nationals",
        "team": "Braves"
      },
      {
        "date": "2019-06-23",
        "score": "Orioles 3–13 Mariners",
        "team": "Mariners"
      },
      {
        "date": "2019-06-24",
        "score": "Mets 7–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 3,
    "start": "2019-08-14",
    "end": "2019-08-16",
    "year": 2019,
    "games": [
      {
        "date": "2019-08-14",
        "score": "Astros 9–13 White Sox",
        "team": "White Sox"
      },
      {
        "date": "2019-08-15",
        "score": "Dodgers 7–13 Marlins",
        "team": "Marlins"
      },
      {
        "date": "2019-08-15",
        "score": "Twins 13–6 Rangers",
        "team": "Twins"
      },
      {
        "date": "2019-08-16",
        "score": "Cardinals 13–4 Reds",
        "team": "Cardinals"
      }
    ]
  },
  {
    "length": 3,
    "start": "2021-06-28",
    "end": "2021-06-30",
    "year": 2021,
    "games": [
      {
        "date": "2021-06-28",
        "score": "Tigers 5–13 Cleveland",
        "team": "Cleveland"
      },
      {
        "date": "2021-06-29",
        "score": "Orioles 13–3 Astros",
        "team": "Orioles"
      },
      {
        "date": "2021-06-30",
        "score": "Twins 3–13 White Sox",
        "team": "White Sox"
      }
    ]
  },
  {
    "length": 3,
    "start": "2022-06-01",
    "end": "2022-06-03",
    "year": 2022,
    "games": [
      {
        "date": "2022-06-01",
        "score": "Marlins 12–13 Rockies",
        "team": "Rockies"
      },
      {
        "date": "2022-06-02",
        "score": "Braves 13–6 Rockies",
        "team": "Braves"
      },
      {
        "date": "2022-06-03",
        "score": "Tigers 0–13 Yankees",
        "team": "Yankees"
      }
    ]
  },
  {
    "length": 3,
    "start": "2024-08-13",
    "end": "2024-08-15",
    "year": 2024,
    "games": [
      {
        "date": "2024-08-13",
        "score": "Royals 3–13 Twins",
        "team": "Twins"
      },
      {
        "date": "2024-08-14",
        "score": "Braves 13–2 Giants",
        "team": "Braves"
      },
      {
        "date": "2024-08-15",
        "score": "Nationals 3–13 Phillies",
        "team": "Phillies"
      }
    ]
  },
  {
    "length": 3,
    "start": "2025-05-23",
    "end": "2025-05-25",
    "year": 2025,
    "games": [
      {
        "date": "2025-05-23",
        "score": "Cubs 13–6 Reds",
        "team": "Cubs"
      },
      {
        "date": "2025-05-24",
        "score": "Yankees 13–1 Rockies",
        "team": "Yankees"
      },
      {
        "date": "2025-05-25",
        "score": "Blue Jays 0–13 Rays",
        "team": "Rays"
      }
    ]
  },
  {
    "length": 3,
    "start": "2026-04-28",
    "end": "2026-04-30",
    "year": 2026,
    "games": [
      {
        "date": "2026-04-28",
        "score": "D-backs 2–13 Brewers",
        "team": "Brewers"
      },
      {
        "date": "2026-04-29",
        "score": "Rockies 13–2 Reds",
        "team": "Rockies"
      },
      {
        "date": "2026-04-30",
        "score": "D-backs 1–13 Brewers",
        "team": "Brewers"
      }
    ]
  },
  {
    "length": 3,
    "start": "2026-06-05",
    "end": "2026-06-07",
    "year": 2026,
    "games": [
      {
        "date": "2026-06-05",
        "score": "Orioles 13–3 Blue Jays",
        "team": "Orioles"
      },
      {
        "date": "2026-06-06",
        "score": "Athletics 2–13 Astros",
        "team": "Astros"
      },
      {
        "date": "2026-06-07",
        "score": "Angels 13–5 Dodgers",
        "team": "Angels"
      }
    ]
  }
]
