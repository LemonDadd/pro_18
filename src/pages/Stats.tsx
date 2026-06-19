import { useEffect, useState } from 'react'
import {
  getWeekDates,
  getLastWeekDates,
  getMonthDates,
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
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [lastPeriodTotal, setLastPeriodTotal] = useState(0)
  const [thisPeriodTotal, setThisPeriodTotal] = useState(0)
  const [topApps, setTopApps] = useState<any[]>([])

  useEffect(() => {
    if (period === 'week') {
      loadWeekData()
    } else {
      loadMonthData()
    }
  }, [period])

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
    setDailyStats(weekStatsArr)
    setLastPeriodTotal(lastWeekStats.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setThisPeriodTotal(weekStatsArr.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setTopApps(topAppsArr)
  }

  const loadMonthData = async () => {
    const now = new Date()
    const { start, end } = getMonthDates(now.getFullYear(), now.getMonth())

    const [monthStats, topAppsArr] = await Promise.all([
      window.electronAPI.stats.week(start, end),
      window.electronAPI.stats.topApps(start, end, 10)
    ])

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthDates = getMonthDates(lastMonth.getFullYear(), lastMonth.getMonth())
    const lastMonthStats = await window.electronAPI.stats.week(lastMonthDates.start, lastMonthDates.end)

    setDailyStats(monthStats)
    setThisPeriodTotal(monthStats.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setLastPeriodTotal(lastMonthStats.reduce((sum: number, s: any) => sum + s.totalSeconds, 0))
    setTopApps(topAppsArr)
    setHeatmapData([])
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

  const maxHeatValue = Math.max(...heatmapGrid.flat().filter(v => v > 0), 1)

  const getHeatColor = (value: number) => {
    if (value === 0) return 'bg-slate-100'
    const ratio = value / maxHeatValue
    if (ratio < 0.25) return 'bg-blue-200'
    if (ratio < 0.5) return 'bg-blue-400'
    if (ratio < 0.75) return 'bg-blue-500'
    return 'bg-blue-700'
  }

  const periodDiff = thisPeriodTotal - lastPeriodTotal
  const periodDiffPercent = lastPeriodTotal > 0
    ? ((periodDiff / lastPeriodTotal) * 100).toFixed(1)
    : '0'

  const weekDailyData = getWeekDates().dates.map(date => {
    const stat = dailyStats.find((s: any) => s.date === date)
    const dayOfWeek = new Date(date).getDay()
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return {
      date,
      day: WEEKDAY_NAMES[dayIndex],
      minutes: stat ? Math.round(stat.totalSeconds / 60) : 0,
      seconds: stat?.totalSeconds || 0
    }
  })

  const monthDailyData = (() => {
    const now = new Date()
    const { start } = getMonthDates(now.getFullYear(), now.getMonth())
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const data = []
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const stat = dailyStats.find((s: any) => s.date === dateStr)
      data.push({
        date: dateStr,
        day: `${i}`,
        minutes: stat ? Math.round(stat.totalSeconds / 60) : 0,
        seconds: stat?.totalSeconds || 0
      })
    }
    return data
  })()

  const monthCalendarData = (() => {
    const now = new Date()
    const { start } = getMonthDates(now.getFullYear(), now.getMonth())
    const firstDay = new Date(start).getDay()
    const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

    const cells: Array<{ day: number | null; value: number; date: string }> = []

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, value: 0, date: '' })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const stat = dailyStats.find((s: any) => s.date === dateStr)
      cells.push({
        day: i,
        value: stat?.totalSeconds || 0,
        date: dateStr
      })
    }

    return cells
  })()

  const maxMonthValue = Math.max(...monthCalendarData.filter(c => c.day !== null).map(c => c.value), 1)

  const getMonthHeatColor = (value: number) => {
    if (value === 0) return 'bg-slate-100'
    const ratio = value / maxMonthValue
    if (ratio < 0.25) return 'bg-green-200'
    if (ratio < 0.5) return 'bg-green-400'
    if (ratio < 0.75) return 'bg-green-500'
    return 'bg-green-700'
  }

  const maxAppDuration = topApps.length > 0 ? topApps[0].totalSeconds : 1
  const dailyChartData = period === 'week' ? weekDailyData : monthDailyData

  const periodLabel = period === 'week' ? '周' : '月'
  const lastPeriodLabel = period === 'week' ? '上周' : '上月'
  const totalDays = period === 'week' ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

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
          <p className="text-sm text-slate-500">本{periodLabel}总时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(thisPeriodTotal)}
          </p>
          <p className={`text-sm mt-2 ${periodDiff >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {periodDiff >= 0 ? '↑' : '↓'} 较{lastPeriodLabel} {Math.abs(Number(periodDiffPercent))}%
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">日均时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(Math.round(thisPeriodTotal / Math.min(totalDays, dailyStats.length || 1)))}
          </p>
          <p className="text-sm text-slate-400 mt-2">按有记录天数计算</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">活跃天数</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {dailyStats.length} / {totalDays} 天
          </p>
          <p className="text-sm text-slate-400 mt-2">本{periodLabel}有使用记录的天数</p>
        </div>
      </div>

      {period === 'week' ? (
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
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">月度日历</h3>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_NAMES.map(name => (
              <div key={name} className="text-center text-xs text-slate-400 py-2">
                {name}
              </div>
            ))}
            {monthCalendarData.map((cell, index) => (
              <div
                key={index}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-colors ${
                  cell.day === null
                    ? 'bg-transparent'
                    : `${getMonthHeatColor(cell.value)} cursor-pointer hover:opacity-80`
                } ${cell.value > 0 && cell.day !== null ? 'text-white' : cell.day !== null ? 'text-slate-600' : ''}`}
                title={cell.day !== null ? `${cell.date} - ${formatDuration(cell.value)}` : ''}
              >
                {cell.day}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm bg-slate-100" />
              <div className="w-4 h-4 rounded-sm bg-green-200" />
              <div className="w-4 h-4 rounded-sm bg-green-400" />
              <div className="w-4 h-4 rounded-sm bg-green-500" />
              <div className="w-4 h-4 rounded-sm bg-green-700" />
            </div>
            <span>多</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">每日时长</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData}>
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
          <h3 className="text-lg font-semibold text-slate-800 mb-4">本{periodLabel}应用排行</h3>
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

        {period === 'week' ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">月度趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthDailyData}>
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
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">分类占比</h3>
            <div className="space-y-3">
              {(() => {
                const categoryMap = new Map<string, { name: string; color: string; seconds: number }>()
                for (const app of topApps) {
                  const catName = app.category || '其他'
                  const catColor = app.categoryColor || '#6b7280'
                  const existing = categoryMap.get(catName) || { name: catName, color: catColor, seconds: 0 }
                  existing.seconds += app.totalSeconds
                  categoryMap.set(catName, existing)
                }
                const categories = Array.from(categoryMap.values()).sort((a, b) => b.seconds - a.seconds)
                const total = categories.reduce((sum, c) => sum + c.seconds, 0)

                return categories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {cat.name}
                        </span>
                        <span className="text-sm text-slate-500 ml-2 flex-shrink-0">
                          {formatDurationShort(cat.seconds)} ({total > 0 ? ((cat.seconds / total) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${total > 0 ? (cat.seconds / total) * 100 : 0}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
