/**
 * Three funny-but-true bullet points per MLB team.
 * Keyed by team abbreviation.
 */
export const TEAM_BLURBS: Record<string, [string, string, string]> = {
  ARI: [
    'Made the World Series in 2023 out of pure chaos energy.',
    'Ketel Marte and now Nolan Arenado. They are collecting All-Stars like Pokémon.',
    'Arizona in July is 117°. Your team plays there. Embrace it.',
  ],
  ATH: [
    'They left Oakland. Sacramento said sure, whatever.',
    'Rich history across three cities. Starting a fourth.',
    "There's something inspiring about a team that just keeps going. Or something.",
  ],
  ATL: [
    'Won the World Series in 2021 and have been acting like it ever since.',
    'Ronald Acuña Jr. can do things humans cannot do.',
    'Atlanta will make you feel invincible until October.',
  ],
  BAL: [
    'Young, fast, and genuinely fun to watch.',
    'Camden Yards is the best ballpark in baseball. No argument.',
    'They came out of nowhere and now expectations exist. Great.',
  ],
  BOS: [
    'The most expensive .500 team money can routinely buy.',
    "David Ortiz retired years ago and they still haven't figured out what to do.",
    "Boston fans will tell you everything that's wrong. At length. Unprompted.",
  ],
  CHC: [
    '2016 happened. Cubs fans bring it up every single day.',
    'Wrigley Field is 110 years old and held together with hope and Old Style.',
    'They are either rebuilding or in a window. No middle ground, ever.',
  ],
  CWS: [
    'Set the MLB record for losses in a single season in 2024. Historic.',
    'It genuinely cannot get worse than this. Statistically.',
    "They can't keep being this bad. Right? Right.",
  ],
  CIN: [
    'Elly De La Cruz does things on a baseball field that should not be physically possible.',
    'Small market, scrappy, occasionally terrifying.',
    'Cincinnati has been waiting for this to come together. Almost there.',
  ],
  CLE: [
    'Quietly good every year without anyone noticing.',
    'José Ramírez has been carrying this team since approximately 2016.',
    'They changed the name and kept the same quiet competence. Respect.',
  ],
  COL: [
    'Coors Field is a paradise for hitters, which is great news for P(13).',
    'Their pitcher ERA numbers look like ZIP codes.',
    "If anyone's scoring 13, there's a real chance it's in Denver.",
  ],
  DET: [
    'The rebuild has been ongoing since around the Obama administration.',
    'Tarik Skubal is a legitimate ace, which makes you believe.',
    'Detroit just needs one good thing to click. Tarik might be it.',
  ],
  HOU: [
    "We are not going to talk about 2017.",
    'Still win 90+ games every year through sheer organizational will.',
    "The most professionally run team you're allowed to dislike.",
  ],
  KC: [
    'Bobby Witt Jr. is genuinely one of the best players in baseball and gets zero credit.',
    'Won the World Series in 2015. People have largely forgotten this.',
    'Kansas City has great barbecue. The bullpen, less so.',
  ],
  LAA: [
    "Mike Trout's career is the saddest story in baseball. You own part of it now.",
    'They have spent close to a billion dollars to finish third in their own division.',
    "Shohei left. They're figuring it out. It's taking a while.",
  ],
  LAD: [
    "Ohtani. Freeman. Betts. You're welcome, and also I'm sorry.",
    'They spend more on pitching depth than most teams spend on everything.',
    "If they score 13, it will not be surprising. That's literally the job.",
  ],
  MIA: [
    'Two World Series titles. Both rosters were immediately dismantled for parts.',
    'The stadium is enormous. The crowds are intimate.',
    'They could turn it around at any point. Any point now.',
  ],
  MIL: [
    'Every year they overachieve. Every year the baseball world acts surprised.',
    'Christian Yelich is still capable of greatness on alternate Tuesdays.',
    'Small market, big heart, deeply underrated.',
  ],
  MIN: [
    'Byron Buxton plays like a superstar and then something happens.',
    "Carlos Correa is getting paid like it's 2022 forever.",
    "Target Field is cold until Father's Day. Games are won anyway.",
  ],
  NYM: [
    'Steve Cohen has spent more money than some sovereign wealth funds.',
    "They missed the playoffs with a $340M payroll. It's fine. Everything is fine.",
    'Juan Soto signed the biggest contract in baseball history to come here. No pressure.',
  ],
  NYY: [
    'The most storied franchise in baseball, plus $300M in annual payroll.',
    'Juan Soto left for the Mets. They are processing this in therapy.',
    "The World Series drought is starting to feel like a personality trait.",
  ],
  PHI: [
    'Bryce Harper actually turned into the player they paid for. Eventually.',
    "Philly fans will boo anything, but they're right about 70% of the time.",
    'Red October energy. Trea Turner is a legitimate problem.',
  ],
  PIT: [
    'Paul Skenes might be the best pitching prospect in a very long time.',
    'PNC Park is gorgeous. The payroll is not.',
    'Pittsburgh deserves a good team. Maybe this is finally the year.',
  ],
  SD: [
    'Spent the money, made the moves, confused everyone by not actually winning.',
    'Manny Machado is locked in until 2028 whether they want that or not.',
    "Fernando Tatis Jr. is back. Whether that's a good thing remains TBD.",
  ],
  SEA: [
    'Last World Series appearance: Never. In 48 years of existence.',
    "Julio Rodríguez is a star playing in the only city that doesn't brag about it.",
    'The most loyal fanbase for the least rewarded franchise in American sports.',
  ],
  SF: [
    'Oracle Park is legitimately the most beautiful stadium in baseball.',
    'Three World Series rings in five years, 2010–2014. Used up all the magic.',
    'They keep finding guys. They just never seem to keep them.',
  ],
  STL: [
    'The Cardinals believe they are simply better than you. They are often right.',
    'Nolan Arenado left for the desert. The Cardinals are still processing the breakup.',
    'Cardinal Nation will explain the Cardinal Way to you. At a Cardinals game. Unprompted.',
  ],
  TB: [
    'Nobody in baseball does more with less. Nobody.',
    'The stadium genuinely looks like a building that became a ballpark by accident.',
    'They could be sold or moved within a few years. Root for them while you can.',
  ],
  TEX: [
    'World Series champions in 2023 in a beautiful new stadium — and it immediately felt like a fluke.',
    'Corey Seager hits the ball very, very hard. That is the entire plan.',
    'Texas in August is 105°. The games are still played.',
  ],
  TOR: [
    'Vladimir Guerrero Jr. is finally becoming the player everyone said he would be. Maybe.',
    'Rogers Centre closes the roof and somehow makes baseball both worse and better.',
    'All of Canada is rooting for you. All of Canada. No pressure.',
  ],
  WSH: [
    'Won the World Series in 2019. Traded Juan Soto. Still recovering emotionally.',
    "Patrick Corbin's contract was a cautionary tale. It has finally, mercifully expired.",
    "They're going to be good again. Probably 2027.",
  ],
}

export function getTeamBlurbs(abbr: string): [string, string, string] {
  return TEAM_BLURBS[abbr.toUpperCase()] ?? [
    'A professional baseball team.',
    'They play 162 games.',
    "One of them might score 13 runs. That's why you're here.",
  ]
}
