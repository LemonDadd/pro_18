import { NavLink, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { formatDurationShort } from '../utils/format'
import { useEffect, useState } from 'react'

const navItems = [
  { path: '/dashboard', label: '今日概况', icon: '📊' },
  { path: '/stats', label: '统计分析', icon: '📈' },
  { path: '/limits', label: '应用限额', icon: '⏱️' },
  { path: '/categories', label: '分类管理', icon: '🏷️' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export default function Sidebar() {
  const location = useLocation()
  const todayTotal = useAppStore(s => s.todayTotal)
  const settings = useAppStore(s => s.settings)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            S
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">ScreenLife</h1>
            <p className="text-xs text-slate-400">屏幕时间管理</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">今日总时长</p>
          <p className="text-2xl font-bold text-slate-800">
            {formatDurationShort(todayTotal)}
          </p>
          {settings?.paused && (
            <div className="mt-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-md inline-block">
              ⏸️ 已暂停追踪
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname.startsWith(item.path)
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {currentTime.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </p>
      </div>
    </aside>
  )
}
