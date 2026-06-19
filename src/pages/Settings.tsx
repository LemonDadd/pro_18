import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function Settings() {
  const settings = useAppStore(s => s.settings)
  const updateSettings = useAppStore(s => s.updateSettings)
  const fetchSettings = useAppStore(s => s.fetchSettings)

  const [recordTitle, setRecordTitle] = useState(false)
  const [titleMaxLength, setTitleMaxLength] = useState(100)
  const [idleThreshold, setIdleThreshold] = useState(60)
  const [paused, setPaused] = useState(false)
  const [blacklistInput, setBlacklistInput] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setRecordTitle(settings.recordWindowTitle)
      setTitleMaxLength(settings.windowTitleMaxLength)
      setIdleThreshold(settings.idleThresholdSeconds)
      setPaused(settings.paused)
    }
  }, [settings])

  const handleSave = async () => {
    await updateSettings({
      recordWindowTitle: recordTitle,
      windowTitleMaxLength: titleMaxLength,
      idleThresholdSeconds: idleThreshold,
      paused
    })
    alert('设置已保存')
  }

  const handleExportCSV = async () => {
    const result = await window.electronAPI.export.csv(undefined, undefined, recordTitle)
    if (result) {
      alert('导出成功')
    }
  }

  const handleExportSummary = async () => {
    const result = await window.electronAPI.export.summary()
    if (result) {
      alert('导出成功')
    }
  }

  const handleAddBlacklist = () => {
    if (!blacklistInput.trim()) return
    const newList = [...(settings?.blacklistedApps || []), blacklistInput.trim()]
    updateSettings({ blacklistedApps: newList })
    setBlacklistInput('')
  }

  const handleRemoveBlacklist = (appName: string) => {
    const newList = (settings?.blacklistedApps || []).filter((a: string) => a !== appName)
    updateSettings({ blacklistedApps: newList })
  }

  const handleTogglePause = async () => {
    const newPaused = !paused
    setPaused(newPaused)
    await updateSettings({ paused: newPaused })
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">设置</h1>
        <p className="text-slate-500 mt-1">管理隐私、导出和追踪设置</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">追踪控制</h3>
            <p className="text-sm text-slate-500 mt-1">暂停或继续屏幕时间追踪</p>
          </div>
          <button
            onClick={handleTogglePause}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              paused
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {paused ? '▶ 继续追踪' : '⏸ 暂停追踪'}
          </button>
        </div>
        {paused && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">
              ⚠️ 追踪已暂停，期间不会记录任何应用使用数据
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">隐私设置</h3>
        <p className="text-sm text-slate-500 mb-6">
          所有数据仅存储在本地，不会上传到任何服务器。
        </p>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">记录窗口标题</p>
              <p className="text-sm text-slate-500 mt-0.5">
                记录每个窗口的标题信息，用于更详细的使用统计。关闭后只记录应用名称。
              </p>
            </div>
            <button
              onClick={() => setRecordTitle(!recordTitle)}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                recordTitle ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  recordTitle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {recordTitle && (
            <div className="ml-0 pl-0 border-l-0">
              <label className="block text-sm text-slate-600 mb-1.5">
                窗口标题最大长度
              </label>
              <input
                type="number"
                value={titleMaxLength}
                onChange={e => setTitleMaxLength(Number(e.target.value))}
                min="10"
                max="500"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">字符数，超过部分会被截断</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              空闲检测阈值（秒）
            </label>
            <input
              type="number"
              value={idleThreshold}
              onChange={e => setIdleThreshold(Number(e.target.value))}
              min="10"
              max="3600"
              className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              超过此时间无操作则视为空闲，不计入使用时间
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">应用黑名单</p>
            <p className="text-sm text-slate-500 mb-3">
              黑名单中的应用不会被追踪记录，适合密码管理器等敏感应用
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={blacklistInput}
                onChange={e => setBlacklistInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBlacklist()}
                placeholder="输入应用名称"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddBlacklist}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings?.blacklistedApps || []).map((app: string) => (
                <div
                  key={app}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-600"
                >
                  {app}
                  <button
                    onClick={() => handleRemoveBlacklist(app)}
                    className="text-slate-400 hover:text-slate-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              {(!settings?.blacklistedApps || settings.blacklistedApps.length === 0) && (
                <p className="text-sm text-slate-400">暂无黑名单应用</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">数据导出</h3>
        <div className="space-y-3">
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">导出 CSV</p>
                <p className="text-xs text-slate-400">
                  导出最近 7 天的详细使用记录
                </p>
              </div>
            </div>
            <span className="text-slate-400">→</span>
          </button>

          <button
            onClick={handleExportSummary}
            className="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-700">导出汇总报告</p>
                <p className="text-xs text-slate-400">
                  导出今日使用情况汇总文本
                </p>
              </div>
            </div>
            <span className="text-slate-400">→</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">关于</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="text-slate-400">应用名称：</span>ScreenLife
          </p>
          <p>
            <span className="text-slate-400">版本：</span>0.1.0
          </p>
          <p>
            <span className="text-slate-400">数据存储：</span>本地 SQLite 数据库
          </p>
          <p className="text-slate-500 mt-4">
            ScreenLife 是一款纯本地的屏幕时间管理工具，帮你了解和管理自己的电脑使用习惯。
            所有数据仅存储在你的设备上，保护你的隐私。
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          保存设置
        </button>
      </div>
    </div>
  )
}
