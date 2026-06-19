export default function StatCard({
  title,
  value,
  subValue,
  subValueClassName,
  icon,
  color
}: {
  title: string
  value: string
  subValue?: string
  subValueClassName?: string
  icon?: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          {subValue && (
            <p className={`text-sm mt-2 ${subValueClassName || 'text-slate-400'}`}>
              {subValue}
            </p>
          )}
        </div>
        {icon && color && (
          <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
