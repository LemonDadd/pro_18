export {}

declare global {
  interface Window {
    electronAPI: {
      stats: {
        today: () => Promise<any[]>
        todayTotal: () => Promise<number>
        hourly: () => Promise<any[]>
        week: (startDate: string, endDate: string) => Promise<any[]>
        heatmap: (startDate: string, endDate: string) => Promise<any[]>
        category: (date: string) => Promise<any[]>
        topApps: (startDate: string, endDate: string, limit?: number) => Promise<any[]>
        monthly: (year: number, month: number) => Promise<any[]>
      }
      app: {
        timeline: (date: string, appName?: string) => Promise<any[]>
        detail: (appName: string, startDate: string, endDate: string) => Promise<any>
      }
      categories: {
        list: () => Promise<any[]>
        add: (name: string, color: string, icon?: string) => Promise<number>
        update: (id: number, name: string, color: string, icon?: string) => Promise<void>
        remove: (id: number) => Promise<void>
        rules: () => Promise<any[]>
        setApp: (appName: string, categoryId: number | null) => Promise<void>
      }
      limits: {
        list: () => Promise<any[]>
        set: (limit: any) => Promise<number>
        remove: (appName: string) => Promise<void>
        remaining: (appName: string) => Promise<number>
      }
      settings: {
        get: () => Promise<any>
        update: (settings: any) => Promise<any>
      }
      tracker: {
        current: () => Promise<any>
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
