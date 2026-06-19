import { contextBridge, ipcRenderer } from 'electron'

const api = {
  stats: {
    today: () => ipcRenderer.invoke('stats:today'),
    todayTotal: () => ipcRenderer.invoke('stats:today-total'),
    hourly: () => ipcRenderer.invoke('stats:hourly'),
    week: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('stats:week', startDate, endDate),
    heatmap: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('stats:heatmap', startDate, endDate),
    category: (date: string) =>
      ipcRenderer.invoke('stats:category', date),
    topApps: (startDate: string, endDate: string, limit: number = 10) =>
      ipcRenderer.invoke('stats:top-apps', startDate, endDate, limit),
    monthly: (year: number, month: number) =>
      ipcRenderer.invoke('stats:monthly', year, month)
  },
  app: {
    timeline: (date: string, appName?: string) =>
      ipcRenderer.invoke('app:timeline', date, appName),
    detail: (appName: string, startDate: string, endDate: string) =>
      ipcRenderer.invoke('app:detail', appName, startDate, endDate)
  },
  categories: {
    list: () => ipcRenderer.invoke('categories:list'),
    add: (name: string, color: string, icon?: string) =>
      ipcRenderer.invoke('categories:add', name, color, icon),
    update: (id: number, name: string, color: string, icon?: string) =>
      ipcRenderer.invoke('categories:update', id, name, color, icon),
    remove: (id: number) => ipcRenderer.invoke('categories:delete', id),
    rules: () => ipcRenderer.invoke('categories:rules'),
    setApp: (appName: string, categoryId: number | null) =>
      ipcRenderer.invoke('categories:set-app', appName, categoryId)
  },
  limits: {
    list: () => ipcRenderer.invoke('limits:list'),
    set: (limit: any) => ipcRenderer.invoke('limits:set', limit),
    remove: (appName: string) => ipcRenderer.invoke('limits:delete', appName),
    remaining: (appName: string) => ipcRenderer.invoke('limits:remaining', appName)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: any) => ipcRenderer.invoke('settings:update', settings)
  },
  tracker: {
    current: () => ipcRenderer.invoke('tracker:current'),
    isActive: () => ipcRenderer.invoke('tracker:is-active')
  },
  export: {
    csv: (startDate?: string, endDate?: string, includeTitle?: boolean) =>
      ipcRenderer.invoke('export:csv', startDate, endDate, includeTitle),
    summary: (date?: string) => ipcRenderer.invoke('export:summary', date)
  },
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide')
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
