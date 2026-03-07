export default function MiniBar({
  value,
  max,
  dim = false,
}: {
  value: number
  max: number
  dim?: boolean
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex-1 bg-gray-900 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all ${dim ? 'bg-gray-800' : 'bg-[#39ff14]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
