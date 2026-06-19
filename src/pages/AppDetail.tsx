import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getWeekDates,
  formatDuration,
  formatDurationShort,
  formatTime,
  getTodayString
} from '../utils/format'
import { useAppStore } from '../store/useAppStore'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const appName = decodeURIComponent(id || '')
  const categories = useAppStore(s => s.categories)
  const categoryRules = useAppStore(s => s.categoryRules)

  const [detail, setDetail] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [limit, setLimit] = useState<any>(null)
  const [limitMinutes, setLimitMinutes] = useState(60)
  const [limitEnabled, setLimitEnabled] = useState(false)
  const [limitAction, setLimitAction] = useState<'notify' | 'lock'>('notify')
  const [lockDuration, setLockDuration] = useState(5)

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    const rule = categoryRules.find(r => r.appName === appName)
    if (rule) {
      setSelectedCategory(rule.categoryId)
    }
  }, [categoryRules, appName])

  useEffect(() => {
    const loadLimit = async () => {
      const limits = await window.electronAPI.limits.list()
      const appLimit = limits.find((l: any) => l.appName === appName)
      if (appLimit) {
        setLimit(appLimit)
        setLimitMinutes(appLimit.dailyLimitMinutes)
        setLimitEnabled(appLimit.enabled)
        setLimitAction(appLimit.action || 'notify')
        setLockDuration(appLimit.lockDurationMinutes || 5)
      }
    }
    loadLimit()
  }, [appName])

  const loadData = async () => {
    const { start, end } = getWeekDates()
    const [appDetail, appTimeline] = await Promise.all([
      window.electronAPI.app.detail(appName, start, end),
      window.electronAPI.app.timeline(getTodayString(), appName)
    ])
    setDetail(appDetail)
    setTimeline(appTimeline)
  }

  const handleCategoryChange = async (categoryId: number | null) => {
    await window.electronAPI.categories.setApp(appName, categoryId)
    setSelectedCategory(categoryId)
    await useAppStore.getState().fetchCategories()
  }

  const handleSaveLimit = async () => {
    await window.electronAPI.limits.set({
      appName,
      dailyLimitMinutes: limitMinutes,
      enabled: limitEnabled,
      action: limitAction,
      lockDurationMinutes: lockDuration
    })
    await useAppStore.getState().fetchLimits()
    alert('限额已保存')
  }

  const categoryRule = categoryRules.find(r => r.appName === appName)
  const category = categories.find(c => c.id === categoryRule?.categoryId)

  const dailyChartData = detail?.dailyStats?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    minutes: Math.round(d.totalSeconds / 60)
  })) || []

  const mergedTimeline: any[] = []
  for (const item of timeline) {
    if (mergedTimeline.length > 0) {
      const last = mergedTimeline[mergedTimeline.length - 1]
      if (last.appName === item.appName && last.windowTitle === item.windowTitle) {
        last.endTime = item.endTime
        last.duration += item.duration
        continue
      }
    }
    mergedTimeline.push({ ...item })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          ← 返回
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{appName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {category ? (
              <span
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">
                未分类
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">本周总时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(detail?.totalSeconds || 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">日均时长</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {formatDuration(
              detail?.days
                ? Math.round(detail.totalSeconds / detail.days)
                : 0
            )}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">活跃天数</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {detail?.days || 0} 天
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500">高峰时段</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {detail?.peakHour >= 0 ? `${detail.peakHour}:00` : '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">每日使用时长</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="分" />
                <Tooltip
                  formatter={(value: number) => [`${value} 分钟`, '使用时长']}
                />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">分类设置</h3>
          <div className="space-y-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-slate-700">{cat.name}</span>
              </button>
            ))}
            <button
              onClick={() => handleCategoryChange(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
              <span className="text-sm text-slate-700">未分类</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">今日时间轴</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {mergedTimeline.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {item.windowTitle || item.appName}
                    </span>
                    <span className="text-sm text-slate-500 flex-shrink-0 ml-2">
                      {formatDurationShort(item.duration)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                  </p>
                </div>
              </div>
            ))}
            {mergedTimeline.length === 0 && (
              <div className="text-center py-8 text-slate-400">今日暂无记录</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">热门窗口标题</h3>
          <div className="space-y-2">
            {detail?.topTitles?.slice(0, 10).map((item: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 flex items-center justify-center text-xs font-medium text-slate-400">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700 truncate max-w-[280px]">
                    {item.title || '(无标题)'}
                  </span>
                </div>
                <span className="text-sm text-slate-500 flex-shrink-0 ml-2">
                  {formatDurationShort(item.totalSeconds)}
                </span>
              </div>
            ))}
            {(!detail?.topTitles || detail.topTitles.length === 0) && (
              <div className="text-center py-8 text-slate-400">
                暂无标题记录
                <p className="text-xs mt-1">请在设置中开启「记录窗口标题」</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">使用限额</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              每日限额（分钟）
            </label>
            <input
              type="number"
              value={limitMinutes}
              onChange={e => setLimitMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-2">
              超时处理
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setLimitAction('notify')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  limitAction === 'notify'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                仅通知
              </button>
              <button
                onClick={() => setLimitAction('lock')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  limitAction === 'lock'
                    ? 'border-red-500 bg-red-50 text-red-600'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                强制休息
              </button>
            </div>
          </div>
          {limitAction === 'lock' && (
            <div>
              <label className="block text-sm text-slate-600 mb-2">
                休息时长（分钟）
              </label>
              <input
                type="number"
                value={lockDuration}
                onChange={e => setLockDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="limit-enabled-detail"
                checked={limitEnabled}
                onChange={e => setLimitEnabled(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="limit-enabled-detail" className="text-sm text-slate-600">
                启用
              </label>
            </div>
            <button
              onClick={handleSaveLimit}
              className="px-6 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
