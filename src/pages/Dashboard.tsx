import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { formatDuration, formatDurationShort, getTodayString } from '../utils/format'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const todayStats = useAppStore(s => s.todayStats)
  const todayTotal = useAppStore(s => s.todayTotal)
  const currentActivity = useAppStore(s => s.currentActivity)
  const limits = useAppStore(s => s.limits)
  const fetchTodayStats = useAppStore(s => s.fetchTodayStats)
  const fetchCurrentActivity = useAppStore(s => s.fetchCurrentActivity)
  const fetchLimits = useAppStore(s => s.fetchLimits)

  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([fetchTodayStats(), fetchCurrentActivity(), fetchLimits()])

    const [hourly, category] = await Promise.all([
      window.electronAPI.stats.hourly(),
      window.electronAPI.stats.category(getTodayString())
    ])

    const hourlyMap = new Map<number, number>()
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, 0)
    }
    for (const h of hourly) {
      hourlyMap.set(h.hour, h.totalSeconds)
    }
    const hourlyArr = Array.from(hourlyMap.entries()).map(([hour, value]) => ({
      hour: `${hour}时`,
      hourNum: hour,
      value: Math.round(value / 60)
    }))
    setHourlyData(hourlyArr)

    setCategoryData(category)
  }

  const topApps = todayStats.slice(0, 5)
  const maxDuration = topApps.length > 0 ? topApps[0].totalDuration : 1

  const categoryColors = categoryData.map(c => c.categoryColor || '#6b7280')

  const limitWarnings = limits
    .filter(limit => limit.enabled)
    .map(limit => {
      const stat = todayStats.find(s => s.appName === limit.appName)
      const used = stat?.totalDuration || 0
      const limitSeconds = limit.dailyLimitMinutes * 60
      const remaining = Math.max(0, limitSeconds - used)
      const usagePercent = limitSeconds > 0 ? (used / limitSeconds) * 100 : 0

      let status: 'normal' | 'warning' | 'danger' = 'normal'
      if (usagePercent >= 100) status = 'danger'
      else if (usagePercent >= 90) status = 'warning'

      return {
        appName: limit.appName,
        used,
        limit: limitSeconds,
        remaining,
        usagePercent,
        status,
        action: limit.action
      }
    })
    .filter(w => w.status !== 'normal')
    .sort((a, b) => b.usagePercent - a.usagePercent)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">今日概况</h1>
          <p className="text-slate-500 mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          🔄 刷新
        </button>
      </div>

      {limitWarnings.length > 0 && (
        <div className="space-y-2">
          {limitWarnings.map(warning => (
            <div
              key={warning.appName}
              className={`flex items-center justify-between px-5 py-4 rounded-2xl cursor-pointer transition-transform hover:scale-[1.01] ${
                warning.status === 'danger'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
              }`}
              onClick={() => navigate(`/apps/${encodeURIComponent(warning.appName)}`)}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">
                  {warning.status === 'danger' ? '🚨' : '⚠️'}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{warning.appName}</h3>
                  <p className="text-sm opacity-90">
                    {warning.status === 'danger'
                      ? `已超过今日限额！已使用 ${formatDurationShort(warning.used)} / ${formatDurationShort(warning.limit)}`
                      : `剩余 ${formatDurationShort(warning.remaining)}，即将达到今日限额`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{warning.usagePercent.toFixed(0)}%</p>
                <p className="text-xs opacity-80">
                  {warning.action === 'lock' ? '强制休息模式' : '仅通知模式'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentActivity && (
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-80 mb-1">当前正在使用</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🖥️
            </div>
            <div>
              <h3 className="text-xl font-semibold">{currentActivity.appName}</h3>
              {currentActivity.windowTitle && (
                <p className="text-sm opacity-80 mt-0.5 truncate max-w-md">
                  {currentActivity.windowTitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="总屏幕时间"
          value={formatDuration(todayTotal)}
          icon="⏱️"
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          title="使用应用数"
          value={`${todayStats.length} 个`}
          icon="📱"
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          title="最常使用"
          value={topApps[0]?.appName || '-'}
          subValue={topApps[0] ? formatDurationShort(topApps[0].totalDuration) : ''}
          icon="🏆"
          color="from-amber-500 to-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">应用排行</h3>
          <div className="space-y-3">
            {topApps.map((app, index) => (
              <div
                key={app.appName}
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
                onClick={() => navigate(`/apps/${encodeURIComponent(app.appName)}`)}
              >
                <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-slate-400">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {app.appName}
                    </span>
                    <span className="text-sm text-slate-500 ml-2 flex-shrink-0">
                      {formatDurationShort(app.totalDuration)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${(app.totalDuration / maxDuration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {topApps.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                暂无数据，开始使用应用后会自动记录
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">分类占比</h3>
          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="totalSeconds"
                    nameKey="categoryName"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={categoryColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatDuration(value)}
                    labelFormatter={(label: string) => label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无分类数据
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {categoryData.map((cat, index) => (
              <div key={cat.categoryName} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColors[index] }}
                />
                <span className="text-xs text-slate-600">{cat.categoryName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">24 小时分布</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="分" />
              <Tooltip formatter={(value: number) => [`${value} 分钟`, '使用时长']} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subValue,
  icon,
  color
}: {
  title: string
  value: string
  subValue?: string
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          {subValue && <p className="text-sm text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
