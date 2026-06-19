import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import Modal from '../components/Modal'

const DEFAULT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#6b7280',
]

export default function Categories() {
  const categories = useAppStore(s => s.categories)
  const categoryRules = useAppStore(s => s.categoryRules)
  const fetchCategories = useAppStore(s => s.fetchCategories)
  const todayStats = useAppStore(s => s.todayStats)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleAddCategory = async () => {
    if (!newName.trim()) return

    if (editingCategory) {
      await window.electronAPI.categories.update(editingCategory.id, newName.trim(), newColor)
    } else {
      await window.electronAPI.categories.add(newName.trim(), newColor)
    }

    setNewName('')
    setNewColor('#3b82f6')
    setEditingCategory(null)
    setShowAddModal(false)
    fetchCategories()
  }

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`确定删除分类「${name}」？该分类下的应用将变为未分类。`)) return
    await window.electronAPI.categories.remove(id)
    fetchCategories()
  }

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat)
    setNewName(cat.name)
    setNewColor(cat.color)
    setShowAddModal(true)
  }

  const getAppCountForCategory = (categoryId: number) => {
    return categoryRules.filter(r => r.categoryId === categoryId).length
  }

  const getCategoryUsage = (categoryName: string) => {
    return todayStats
      .filter(s => s.category === categoryName)
      .reduce((sum, s) => sum + s.totalDuration, 0)
  }

  const uncategorizedApps = todayStats.filter(s => !s.category)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">分类管理</h1>
          <p className="text-slate-500 mt-1">管理应用分类，自定义分类规则</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null)
            setNewName('')
            setNewColor('#3b82f6')
            setShowAddModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          + 新建分类
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map(cat => {
          const appCount = getAppCountForCategory(cat.id)
          const usage = getCategoryUsage(cat.name)

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon || '📁'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{cat.name}</h3>
                    <p className="text-xs text-slate-400">{appCount} 个应用</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-1">今日使用</p>
                <p className="text-lg font-semibold text-slate-800">
                  {Math.round(usage / 60)} 分钟
                </p>
              </div>
            </div>
          )
        })}

        <div className="bg-slate-50 rounded-2xl p-5 border-2 border-dashed border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-lg">
              ❓
            </div>
            <div>
              <h3 className="font-semibold text-slate-600">未分类</h3>
              <p className="text-xs text-slate-400">
                {uncategorizedApps.length} 个应用
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-400 mb-1">今日使用</p>
            <p className="text-lg font-semibold text-slate-600">
              {Math.round(
                uncategorizedApps.reduce((sum, s) => sum + s.totalDuration, 0) / 60
              )}{' '}
              分钟
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">应用分类规则</h3>
        <p className="text-sm text-slate-500 mb-4">
          系统会根据应用名称自动匹配分类。您可以在应用详情页面修改单个应用的分类。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {categoryRules.map(rule => {
            const cat = categories.find(c => c.id === rule.categoryId)
            return (
              <div
                key={rule.id}
                className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg"
              >
                <span className="text-sm text-slate-700 truncate flex-1">{rule.appName}</span>
                <div className="flex items-center gap-2 ml-2">
                  {cat ? (
                    <span
                      className="px-2 py-0.5 text-xs rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.name}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600 flex-shrink-0">
                      未分类
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showAddModal && (
        <Modal title={editingCategory ? '编辑分类' : '新建分类'} onClose={() => { setShowAddModal(false); setEditingCategory(null) }} onConfirm={handleAddCategory}>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">分类名称</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="输入分类名称" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">分类颜色</label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map(color => (
                <button key={color} onClick={() => setNewColor(color)} className={`w-8 h-8 rounded-lg transition-transform ${newColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
