/**
 * Retrosheet team code → current MLB abbreviation.
 * Teams that moved or renamed keep the current franchise.
 * Codes not in this map are skipped (defunct leagues / clubs).
 *
 * Used by the Retrosheet seed and by TEAM_ABBR_ALIASES so History, team pages,
 * and matchups roll every stored code into the same 30 clubs.
 */
export const RETRO_TO_ABBR: Record<string, string> = {
  // AL
  BAL: 'BAL', BOS: 'BOS', CHA: 'CWS', CLE: 'CLE', DET: 'DET',
  HOU: 'HOU', KCA: 'KC',  LAA: 'LAA', MIN: 'MIN', NYA: 'NYY',
  OAK: 'ATH', SEA: 'SEA', TBA: 'TB',  TEX: 'TEX', TOR: 'TOR',
  ANA: 'LAA',  // Anaheim Angels (Retrosheet code through 2021+)
  CAL: 'LAA',  // California Angels
  // Historical AL franchises → modern equivalent
  MLA: 'BAL',  // Milwaukee Brewers (AL, 1901) → Baltimore Orioles
  SLA: 'BAL',  // St. Louis Browns → Baltimore Orioles
  WS1: 'MIN',  // Washington Senators (orig) → Twins
  WS2: 'TEX',  // Washington Senators (expansion) → Rangers
  PHA: 'ATH',  // Philadelphia Athletics
  KC1: 'ATH',  // Kansas City A's (1955–67). Must be Latin KC1 — a Cyrillic А never matches.
  SE1: 'MIL',  // Seattle Pilots (1969) → Milwaukee Brewers
  ATH: 'ATH',  // Athletics (Retrosheet 2025+, after dropping OAK)
  BLA: 'NYY',  // Baltimore Orioles (AL 1901–02) → Highlanders/Yankees (not today's BAL)
  // NL
  ATL: 'ATL', CHN: 'CHC', CIN: 'CIN', COL: 'COL', LAN: 'LAD',
  MIA: 'MIA', MIL: 'MIL', NYN: 'NYM', PHI: 'PHI', PIT: 'PIT',
  SDN: 'SD',  SFN: 'SF',  SLN: 'STL', WAS: 'WSH', ARI: 'ARI',
  // Historical NL franchises → modern equivalent
  BSN: 'ATL',  // Boston Braves → Milwaukee → Atlanta Braves
  MLN: 'ATL',  // Milwaukee Braves → Atlanta
  BR1: 'LAD',  // Brooklyn Eckfords (NA 1872) — kept for backward compatibility; 0 thirteen-run games
  BRO: 'LAD',  // Brooklyn Dodgers
  NY1: 'SF',   // New York Giants → San Francisco Giants
  FLO: 'MIA',  // Florida Marlins
  MON: 'WSH',  // Montreal Expos → Washington Nationals
}
