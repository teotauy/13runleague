interface ScorigramiGridProps {
  teamAbbr: string
  runCounts: Record<number, number> // run total -> frequency
}

export default function ScorigramiGrid({ teamAbbr, runCounts }: ScorigramiGridProps) {
  const max = Math.max(...Object.values(runCounts), 1)

  return (
    <div className="rounded bg-[#111] p-3 border border-gray-900">
      <div className="text-xs font-mono text-gray-400 mb-2 font-bold">{teamAbbr}</div>
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: 21 }, (_, i) => {
          const count = runCounts[i] ?? 0
          const intensity = count / max
          return (
            <div
              key={i}
              title={`${i} runs: ${count} games`}
              className="w-5 h-5 rounded-sm text-[8px] font-mono flex items-center justify-center text-black"
              style={{
                backgroundColor:
                  count === 0
                    ? '#1a1a1a'
                    : `rgba(57, 255, 20, ${0.15 + intensity * 0.85})`,
              }}
            >
              {i === 13 ? (
                <span className="text-black font-bold" style={{ fontSize: '7px' }}>13</span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="text-[10px] text-gray-400 mt-1 font-mono">0 ——————— 20+</div>
    </div>
  )
}
