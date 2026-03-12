/**
 * MLB Team Color Mappings
 * Used for visualizing champions in the Past Champions Banner and other team-based displays
 * Colors chosen for accessibility, distinct visual separation, and WCAG AA contrast compliance
 */

export interface TeamColor {
  abbreviation: string
  name: string
  primaryColor: string // Hex color for background
  textColor: string // 'white' or '#111' depending on contrast requirements
  darkVariant?: string // Optional darker shade for text/borders
}

export const TEAM_COLORS: Record<string, TeamColor> = {
  // AL East
  ARI: {
    abbreviation: 'ARI',
    name: 'Diamondbacks',
    primaryColor: '#A71039',
    textColor: '#ffffff',
    darkVariant: '#6B0726',
  },
  ATL: {
    abbreviation: 'ATL',
    name: 'Braves',
    primaryColor: '#13274F',
    textColor: '#ffffff',
    darkVariant: '#0A1530',
  },
  BAL: {
    abbreviation: 'BAL',
    name: 'Orioles',
    primaryColor: '#DF4601',
    textColor: '#ffffff',
    darkVariant: '#8B2A00',
  },
  BOS: {
    abbreviation: 'BOS',
    name: 'Red Sox',
    primaryColor: '#BD3039',
    textColor: '#ffffff',
    darkVariant: '#7A1D24',
  },
  CHC: {
    abbreviation: 'CHC',
    name: 'Cubs',
    primaryColor: '#0E3386',
    textColor: '#ffffff',
    darkVariant: '#081E52',
  },
  CWS: {
    abbreviation: 'CWS',
    name: 'White Sox',
    primaryColor: '#27251F',
    textColor: '#ffffff',
    darkVariant: '#0D0A08',
  },
  CLE: {
    abbreviation: 'CLE',
    name: 'Guardians',
    primaryColor: '#00385D',
    textColor: '#ffffff',
    darkVariant: '#001F35',
  },
  CIN: {
    abbreviation: 'CIN',
    name: 'Reds',
    primaryColor: '#C6011F',
    textColor: '#ffffff',
    darkVariant: '#7A0012',
  },
  COL: {
    abbreviation: 'COL',
    name: 'Rockies',
    primaryColor: '#33006F',
    textColor: '#ffffff',
    darkVariant: '#1A003A',
  },
  DET: {
    abbreviation: 'DET',
    name: 'Tigers',
    primaryColor: '#0C2C56',
    textColor: '#ffffff',
    darkVariant: '#051530',
  },
  HOU: {
    abbreviation: 'HOU',
    name: 'Astros',
    primaryColor: '#EB6E1F',
    textColor: '#ffffff',
    darkVariant: '#A64D14',
  },

  // AL Central
  KC: {
    abbreviation: 'KC',
    name: 'Royals',
    primaryColor: '#20426A',
    textColor: '#ffffff',
    darkVariant: '#0F253D',
  },
  LAA: {
    abbreviation: 'LAA',
    name: 'Angels',
    primaryColor: '#BA3021',
    textColor: '#ffffff',
    darkVariant: '#701C14',
  },
  LAD: {
    abbreviation: 'LAD',
    name: 'Dodgers',
    primaryColor: '#005A9C',
    textColor: '#ffffff',
    darkVariant: '#003559',
  },
  MIA: {
    abbreviation: 'MIA',
    name: 'Marlins',
    primaryColor: '#00A3E0',
    textColor: '#111111',
    darkVariant: '#006B9F',
  },
  MIL: {
    abbreviation: 'MIL',
    name: 'Brewers',
    primaryColor: '#12284B',
    textColor: '#ffffff',
    darkVariant: '#081829',
  },
  MIN: {
    abbreviation: 'MIN',
    name: 'Twins',
    primaryColor: '#002B5C',
    textColor: '#ffffff',
    darkVariant: '#001A37',
  },
  NYM: {
    abbreviation: 'NYM',
    name: 'Mets',
    primaryColor: '#002D72',
    textColor: '#ffffff',
    darkVariant: '#001544',
  },
  NYY: {
    abbreviation: 'NYY',
    name: 'Yankees',
    primaryColor: '#0C2C56',
    textColor: '#ffffff',
    darkVariant: '#051530',
  },

  // AL West
  ATH: {
    abbreviation: 'ATH',
    name: 'Athletics',
    primaryColor: '#003831',
    textColor: '#ffffff',
    darkVariant: '#001A1A',
  },
  PHI: {
    abbreviation: 'PHI',
    name: 'Phillies',
    primaryColor: '#A6192E',
    textColor: '#ffffff',
    darkVariant: '#640C1A',
  },
  PIT: {
    abbreviation: 'PIT',
    name: 'Pirates',
    primaryColor: '#27251F',
    textColor: '#ffffff',
    darkVariant: '#0D0A08',
  },
  SD: {
    abbreviation: 'SD',
    name: 'Padres',
    primaryColor: '#2F241D',
    textColor: '#ffffff',
    darkVariant: '#17120F',
  },
  SEA: {
    abbreviation: 'SEA',
    name: 'Mariners',
    primaryColor: '#0C2C56',
    textColor: '#ffffff',
    darkVariant: '#051530',
  },
  SF: {
    abbreviation: 'SF',
    name: 'Giants',
    primaryColor: '#FD5015',
    textColor: '#ffffff',
    darkVariant: '#A03010',
  },
  STL: {
    abbreviation: 'STL',
    name: 'Cardinals',
    primaryColor: '#C41E3A',
    textColor: '#ffffff',
    darkVariant: '#7A1225',
  },
  TB: {
    abbreviation: 'TB',
    name: 'Rays',
    primaryColor: '#092C5F',
    textColor: '#ffffff',
    darkVariant: '#041638',
  },
  TEX: {
    abbreviation: 'TEX',
    name: 'Rangers',
    primaryColor: '#003278',
    textColor: '#ffffff',
    darkVariant: '#001A47',
  },
  TOR: {
    abbreviation: 'TOR',
    name: 'Blue Jays',
    primaryColor: '#134687',
    textColor: '#ffffff',
    darkVariant: '#0A2854',
  },
  WSH: {
    abbreviation: 'WSH',
    name: 'Nationals',
    primaryColor: '#AB0003',
    textColor: '#ffffff',
    darkVariant: '#6B0002',
  },
}

/**
 * Get team color by abbreviation
 * Falls back to neutral gray if team not found
 */
export function getTeamColor(abbreviation: string): TeamColor {
  return (
    TEAM_COLORS[abbreviation] || {
      abbreviation,
      name: abbreviation,
      primaryColor: '#666666',
      textColor: '#ffffff',
      darkVariant: '#333333',
    }
  )
}

/**
 * Rank colors for champion badges
 */
export const RANK_COLORS = {
  1: {
    badge: '🥇',
    background: '#FFD700',
    text: '#111111',
  },
  2: {
    badge: '🥈',
    background: '#C0C0C0',
    text: '#111111',
  },
  3: {
    badge: '🥉',
    background: '#CD7F32',
    text: '#ffffff',
  },
  other: {
    badge: '⭐',
    background: '#9CA3AF',
    text: '#111111',
  },
}
