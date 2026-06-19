import type {
  AppDailyStat,
  HourlyStat,
  DayStat,
  HeatmapCell,
  CategoryStat,
  TopApp,
  AppTimelineItem,
  AppDetail,
  Category,
  AppCategoryRule,
  AppLimit,
  Settings,
  SettingsUpdate,
  CurrentActivity
} from '../shared/types'

export {}

declare global {
  interface Window {
    electronAPI: {
      stats: {
        today: () => Promise<AppDailyStat[]>
        todayTotal: () => Promise<number>
        hourly: () => Promise<HourlyStat[]>
        week: (startDate: string, endDate: string) => Promise<DayStat[]>
        heatmap: (startDate: string, endDate: string) => Promise<HeatmapCell[]>
        category: (date: string) => Promise<CategoryStat[]>
        topApps: (startDate: string, endDate: string, limit?: number) => Promise<TopApp[]>
        monthly: (year: number, month: number) => Promise<DayStat[]>
      }
      app: {
        timeline: (date: string, appName?: string) => Promise<AppTimelineItem[]>
        detail: (appName: string, startDate: string, endDate: string) => Promise<AppDetail | null>
      }
      categories: {
        list: () => Promise<Category[]>
        add: (name: string, color: string, icon?: string) => Promise<number>
        update: (id: number, name: string, color: string, icon?: string) => Promise<void>
        remove: (id: number) => Promise<void>
        rules: () => Promise<AppCategoryRule[]>
        setApp: (appName: string, categoryId: number | null) => Promise<void>
      }
      limits: {
        list: () => Promise<AppLimit[]>
        set: (limit: AppLimit) => Promise<number>
        remove: (appName: string) => Promise<void>
        remaining: (appName: string) => Promise<number>
      }
      settings: {
        get: () => Promise<Settings>
        update: (settings: SettingsUpdate) => Promise<Settings>
      }
      tracker: {
        current: () => Promise<CurrentActivity | null>
        isActive: () => Promise<boolean>
      }
      export: {
        csv: (startDate?: string, endDate?: string, includeTitle?: boolean) => Promise<string | null>
        summary: (date?: string) => Promise<string | null>
      }
      window: {
        show: () => Promise<void>
        hide: () => Promise<void>
      }
    }
  }
}
