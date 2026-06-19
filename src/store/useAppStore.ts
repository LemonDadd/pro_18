import { create } from 'zustand'

interface AppState {
  todayStats: any[]
  todayTotal: number
  categories: any[]
  categoryRules: any[]
  limits: any[]
  settings: any
  currentActivity: any
  loading: boolean

  fetchTodayStats: () => Promise<void>
  fetchCategories: () => Promise<void>
  fetchLimits: () => Promise<void>
  fetchSettings: () => Promise<void>
  fetchCurrentActivity: () => Promise<void>
  updateSettings: (settings: any) => Promise<void>
  refreshAll: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  todayStats: [],
  todayTotal: 0,
  categories: [],
  categoryRules: [],
  limits: [],
  settings: null,
  currentActivity: null,
  loading: false,

  fetchTodayStats: async () => {
    try {
      const [stats, total] = await Promise.all([
        window.electronAPI.stats.today(),
        window.electronAPI.stats.todayTotal()
      ])
      set({ todayStats: stats, todayTotal: total })
    } catch (e) {
      console.error('Failed to fetch today stats:', e)
    }
  },

  fetchCategories: async () => {
    try {
      const [cats, rules] = await Promise.all([
        window.electronAPI.categories.list(),
        window.electronAPI.categories.rules()
      ])
      set({ categories: cats, categoryRules: rules })
    } catch (e) {
      console.error('Failed to fetch categories:', e)
    }
  },

  fetchLimits: async () => {
    try {
      const limits = await window.electronAPI.limits.list()
      set({ limits })
    } catch (e) {
      console.error('Failed to fetch limits:', e)
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await window.electronAPI.settings.get()
      set({ settings })
    } catch (e) {
      console.error('Failed to fetch settings:', e)
    }
  },

  fetchCurrentActivity: async () => {
    try {
      const activity = await window.electronAPI.tracker.current()
      set({ currentActivity: activity })
    } catch (e) {
      console.error('Failed to fetch current activity:', e)
    }
  },

  updateSettings: async (newSettings: any) => {
    try {
      const settings = await window.electronAPI.settings.update(newSettings)
      set({ settings })
    } catch (e) {
      console.error('Failed to update settings:', e)
    }
  },

  refreshAll: async () => {
    set({ loading: true })
    try {
      await Promise.all([
        get().fetchTodayStats(),
        get().fetchCategories(),
        get().fetchLimits(),
        get().fetchSettings(),
        get().fetchCurrentActivity()
      ])
    } finally {
      set({ loading: false })
    }
  }
}))
