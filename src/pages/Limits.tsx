import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import ProgressBar from '../components/ProgressBar'
import { useAppStore } from '../store/useAppStore'
import { formatDurationShort, getTodayString } from '../utils/format'

export default function Limits() {
  const navigate = useNavigate()
  const limits = useAppStore(s => s.limits)
  const fetchLimits = useAppStore(s => s.fetchLimits)
  const todayStats = useAppStore(s => s.todayStats)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newLimitMinutes, setNewLimitMinutes] = useState(60)
  const [newAction, setNewAction] = useState<'notify' | 'lock'>('notify')

  useEffect(() => {
    fetchLimits()
  }, [fetchLimits])

  const handleAddLimit = async () => {
    if (!newAppName.trim()) return

    await window.electronAPI.limits.set({
      appName: newAppName.trim(),
      dailyLimitMinutes: newLimitMinutes,
      enabled: true,
      action: newAction,
      lockDurationMinutes: 5
    })

    setNewAppName('')
    setNewLimitMinutes(60)
    setNewAction('notify')
    setShowAddModal(false)
    fetchLimits()
  }

  const handleToggleLimit = async (appName: string, enabled: boolean) => {
    const limit = limits.find(l => l.appName === appName)
    if (!limit) return

    await window.electronAPI.limits.set({
      ...limit,
      enabled
    })
    fetchLimits()
  }

  const handleDeleteLimit = async (appName: string) => {
    if (!confirm(`确定删除 ${appName} 的限额？`)) return
    await window.electronAPI.limits.remove(appName)
    fetchLimits()
  }

  const getAppUsage = (appName: string) => {
    const stat = todayStats.find(s => s.appName === appName)
    return stat?.totalDuration || 0
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">应用限额</h1>
          <p className="text-slate-500 mt-1">设置每日使用时长限制，防止沉迷</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          + 添加限额
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-medium text-amber-800">防沉迷提醒</p>
            <p className="text-sm text-amber-600 mt-1">
              当应用使用时间达到限额的 90% 时会发送提醒，达到限额时可选择仅通知或强制休息。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">应用</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">今日使用</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">每日限额</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">类型</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">状态</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody>
            {limits.map(limit => {
              const usage = getAppUsage(limit.appName)
              const limitSeconds = limit.dailyLimitMinutes * 60
              const progress = Math.min(100, (usage / limitSeconds) * 100)
              const remaining = Math.max(0, limitSeconds - usage)
              const isOver = usage >= limitSeconds

              return (
                <tr
                  key={limit.appName}
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/apps/${encodeURIComponent(limit.appName)}`)}
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-800">{limit.appName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className={`text-sm ${isOver ? 'text-red-500 font-medium' : 'text-slate-600'}`}>
                        {formatDurationShort(usage)}
                      </span>
                      <ProgressBar value={usage} max={limitSeconds} color={isOver ? 'red' : progress > 80 ? 'amber' : 'blue'} height="h-1.5" className="w-24 mt-1" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{limit.dailyLimitMinutes} 分钟</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-md ${
                      limit.action === 'lock'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {limit.action === 'lock' ? '强制休息' : '仅通知'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleToggleLimit(limit.appName, !limit.enabled)
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        limit.enabled ? 'bg-blue-500' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          limit.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleDeleteLimit(limit.appName)
                      }}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              )
            })}
            {limits.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="暂无限额设置，点击「添加限额」开始配置" className="px-6 py-12" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <Modal title="添加应用限额" onClose={() => setShowAddModal(false)} onConfirm={handleAddLimit}>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">应用名称</label>
            <input type="text" value={newAppName} onChange={e => setNewAppName(e.target.value)} placeholder="输入应用名称，如：哔哩哔哩" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">每日限额（分钟）</label>
            <input type="number" value={newLimitMinutes} onChange={e => setNewLimitMinutes(Number(e.target.value))} min="1" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">超时处理</label>
            <div className="flex gap-3">
              <button onClick={() => setNewAction('notify')} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${newAction === 'notify' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>仅通知</button>
              <button onClick={() => setNewAction('lock')} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${newAction === 'lock' ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>强制休息</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
