export default function ProgressBar({
  value,
  max,
  color = 'blue',
  customColor,
  height = 'h-2',
  className = ''
}: {
  value: number
  max: number
  color?: 'blue' | 'amber' | 'red'
  customColor?: string
  height?: string
  className?: string
}) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0

  const colorClass = customColor
    ? ''
    : color === 'red'
      ? 'bg-red-500'
      : color === 'amber'
        ? 'bg-amber-500'
        : 'bg-gradient-to-r from-blue-400 to-cyan-400'

  return (
    <div className={`${height} bg-slate-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{
          width: `${percent}%`,
          ...(customColor ? { backgroundColor: customColor } : {})
        }}
      />
    </div>
  )
}
