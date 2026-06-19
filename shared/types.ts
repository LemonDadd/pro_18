export interface WindowActivity {
  id?: number
  appName: string
  windowTitle: string
  startTime: number
  endTime: number
  duration: number
  date: string
}

export interface AppDailyStat {
  appName: string
  date: string
  totalDuration: number
  category?: string
}

export interface Category {
  id?: number
  name: string
  color: string
  icon?: string
}

export interface AppCategoryRule {
  id?: number
  appName: string
  bundleId?: string
  categoryId: number
}

export interface AppLimit {
  id?: number
  appName: string
  dailyLimitMinutes: number
  enabled: boolean
  action: 'notify' | 'lock'
  lockDurationMinutes?: number
}

export interface Settings {
  recordWindowTitle: boolean
  windowTitleMaxLength: number
  idleThresholdSeconds: number
  autoStart: boolean
  paused: boolean
  blacklistedApps: string[]
}

export interface DayStat {
  date: string
  totalSeconds: number
}

export interface HourlyStat {
  hour: number
  totalSeconds: number
}

export interface HeatmapCell {
  day: number
  hour: number
  value: number
}

export interface AppTimelineItem {
  appName: string
  windowTitle: string
  startTime: number
  endTime: number
  duration: number
}

export interface CategoryStat {
  categoryName: string
  categoryColor: string
  totalSeconds: number
}

export interface TopApp {
  appName: string
  totalSeconds: number
  category?: string
  categoryColor?: string
}

export interface AppTopTitle {
  title: string
  totalSeconds: number
}

export interface AppDailyDetail {
  date: string
  totalSeconds: number
}

export interface AppDetail {
  totalSeconds: number
  days: number
  dailyStats: AppDailyDetail[]
  topTitles: AppTopTitle[]
  peakHour?: number
}

export interface CurrentActivity {
  appName: string
  windowTitle: string
  startTime: number
}

export type SettingsUpdate = Partial<Pick<Settings,
  | 'recordWindowTitle'
  | 'windowTitleMaxLength'
  | 'idleThresholdSeconds'
  | 'autoStart'
  | 'paused'
  | 'blacklistedApps'
>>
