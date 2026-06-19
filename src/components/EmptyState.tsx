export default function EmptyState({
  message,
  description,
  className = 'py-8'
}: {
  message: string
  description?: string
  className?: string
}) {
  return (
    <div className={`text-center ${className} text-slate-400`}>
      {message}
      {description && <p className="text-xs mt-1">{description}</p>}
    </div>
  )
}
