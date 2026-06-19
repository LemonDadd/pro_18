import { useEffect, useState } from 'react'
import {
  getWeekDates,
  getLastWeekDates,
  formatDuration,
  formatDurationShort,
  WEEKDAY_NAMES
} from '../utils/format'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts'

export default function Stats() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [heatmapData, setHeatmapData] = useState<any[]>([])
  const [weekStats, setWeekStats] = useState<any[]>([])
  const [lastWeekTotal, setLastWeekTotal] = useState(0)
  const [thisWeekTotal, setThisWeekTotal] = useState(0)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [topApps, setTopApps] = useState<any[]>([])

  useEffect(() => {
    loadWeekData()
  }, [])

  const loadWeekData = async () => {
    const { start, end } = getWeekDates()
    const lastWeek = getLastWeekDates()

    const [heatmap, weekStatsArr, lastWeekStats, topAppsArr] = await Promise.all([
      window.electronAPI.stats.heatmap(start, end),
      window.electronAPI.stats.week(start, end),
      window.electronAPI.stats.week(lastWeek.start, lastWeek.end),
      window.electronAPI.stats.topApps(start, end, 10)
    ])

    setHeatmapData(heatmap)
    setWeekStats(weekStatsArr)
    setLastWeekTotal(lastWeekStats.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setThisWeekTotal(weekStatsArr.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setTopApps(topAppsArr)

    const now = new Date()
    const monthly = await window.electronAPI.stats.monthly(now.getFullYear(), now.getMonth())
    setMonthlyData(
      monthly.map((m: any) => ({
        ...m,
        day: new Date(m.date).getDate(),
        minutes: Math.round(m.totalSeconds / 60)
      }))
    )
  }

  const heatmapGrid: number[][] = Array(7)
    .fill(null)
    .map(() => Array(24).fill(0))

  for (const cell of heatmapData) {
    const dayIndex = cell.day === 0 ? 6 : cell.day - 1
    if (dayIndex >= 0 && dayIndex < 7 && cell.hour >= 0 && cell.hour < 24) {
      heatmapGrid[dayIndex][cell.hour] = cell.value
    }
  }

  const maxValue = Math.max(...heatmapGrid.flat().filter(v => v > 0), 1)

  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-slate-100'
    const ratio = value / maxValue
    if (ratio < 0.25) return 'bg-blue-200'
    if (ratio < 0.5) return 'bg-blue-400'
    if (ratio < 0.75) return 'bg-blue-500'
    return 'bg-blue-700'
  }

  const weekDiff = thisWeekTotal - lastWeekTotal
  const weekDiffPercent = lastWeekTotal > 0
    ? ((weekDiff / lastWeekTotal) * 100).toFixed(1)
    : '0'

  const weekDailyData = getWeekDates().dates.map(date => {
    const stat = weekStats.find((s: any) => s.date === date)
    const dayOfWeek = new Date(date).getDay()
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return {
      date,
      day: WEEKDAY_NAMES[dayIndex],
      minutes: stat ? Math.round(stat.totalSeconds / 60) : 0,
      seconds: stat?.totalSeconds || 0
    }
  })

  const maxAppDuration = topApps.length > 0 ? topApps[0].totalSeconds : 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">统计分析</h1>
          <p className="text-slate-500 mt-1">查看使用趋势和热力图</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              period === 'week' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            周视图
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              period === 'month' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            月视图
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">本周总时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(thisWeekTotal)}
          </p>
          <p className={`text-sm mt-2 ${weekDiff >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {weekDiff >= 0 ? '↑' : '↓'} 较上周 {Math.abs(Number(weekDiffPercent))}%
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">日均时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(Math.round(thisWeekTotal / Math.min(7, weekStats.length || 1)))}
          </p>
          <p className="text-sm text-slate-400 mt-2">按有记录天数计算</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">活跃天数</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {weekStats.length} / 7 天
          </p>
          <p className="text-sm text-slate-400 mt-2">本周有使用记录的天数</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">时段热力图</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex ml-16">
              {Array(24)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-xs text-slate-400"
                  >
                    {i}
                  </div>
                ))}
            </div>
            {heatmapGrid.map((day, dayIndex) => (
              <div key={dayIndex} className="flex items-center mt-1">
                <div className="w-16 text-right pr-3 text-sm text-slate-500">
                  {WEEKDAY_NAMES[dayIndex]}
                </div>
                <div className="flex-1 flex gap-1">
                  {day.map((value, hourIndex) => (
                    <div
                      key={hourIndex}
                      className={`flex-1 h-8 rounded-sm ${getHeatColor(value || 0)} transition-colors hover:opacity-80`}
                      title={`${WEEKDAY_NAMES[dayIndex]} ${hourIndex}:00 - ${formatDuration(value || 0)}`}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
              <span>少</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-slate-100" />
                <div className="w-4 h-4 rounded-sm bg-blue-200" />
                <div className="w-4 h-4 rounded-sm bg-blue-400" />
                <div className="w-4 h-4 rounded-sm bg-blue-500" />
                <div className="w-4 h-4 rounded-sm bg-blue-700" />
              </div>
              <span>多</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">每日时长</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekDailyData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="分" />
              <Tooltip
                formatter={(value: number) => [`${value} 分钟`, '使用时长']}
                labelFormatter={(label: string) => label}
              />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">本周应用排行</h3>
          <div className="space-y-3">
            {topApps.map((app: any, index: number) => (
              <div key={app.appName} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center text-xs font-medium text-slate-400">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {app.appName}
                    </span>
                    <span className="text-sm text-slate-500 ml-2 flex-shrink-0">
                      {formatDurationShort(app.totalSeconds)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                      style={{ width: `${(app.totalSeconds / maxAppDuration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {topApps.length === 0 && (
              <div className="text-center py-8 text-slate-400">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">月度趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="分" />
                <Tooltip
                  formatter={(value: number) => [`${value} 分钟`, '使用时长']}
                  labelFormatter={(label: string) => `${label} 日`}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
