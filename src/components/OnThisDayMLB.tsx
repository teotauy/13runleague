import type { OnThisDayGame } from '@/lib/mlb'

interface Props {
  games: OnThisDayGame[]
  monthDay: string // MM-DD
}

export default function OnThisDayMLB({ games, monthDay }: Props) {
  if (games.length === 0) return null

  const [month, day] = monthDay.split('-').map(Number)
  const label = new Date(2000, month - 1, day).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold">
          <span className="text-[#39ff14]">13</span> on This Day
        </h2>
        <span className="text-xs text-gray-600 font-mono">
          {label} in MLB history · {games.length} game{games.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {games.map((g) => {
          const awayIs13 = g.awayScore === 13
          const homeIs13 = g.homeScore === 13

          return (
            <div
              key={`${g.year}-${g.awayTeam}-${g.homeTeam}`}
              className="flex items-center gap-3 text-sm rounded-lg bg-white/[0.03] border border-white/[0.05] px-4 py-2"
            >
              <span className="text-gray-500 font-mono text-xs w-10 shrink-0">{g.year}</span>
              <span className="text-white flex-1">
                <span className={awayIs13 ? 'text-[#39ff14] font-bold' : 'text-gray-300'}>
                  {g.awayTeam}
                </span>
                <span className="text-gray-600 mx-1">@</span>
                <span className={homeIs13 ? 'text-[#39ff14] font-bold' : 'text-gray-300'}>
                  {g.homeTeam}
                </span>
              </span>
              <span className="font-mono text-xs shrink-0">
                <span className={awayIs13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>{g.awayScore}</span>
                <span className="text-gray-600">–</span>
                <span className={homeIs13 ? 'text-[#39ff14] font-bold' : 'text-gray-400'}>{g.homeScore}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
