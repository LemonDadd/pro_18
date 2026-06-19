import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { startTracking, stopTracking, getCurrentActivity, isTrackingActive, refreshSettings } from './tracker'
import { startLimitChecker, stopLimitChecker, resetDailyNotifications, getAppRemainingTime } from './limit-checker'
import { createTray, refreshTray, destroyTray } from './tray'
import { exportCSV, exportSummary } from './export-service'
import {
  getTodayStats,
  getTodayTotal,
  getHourlyStats,
  getWeekStats,
  getHeatmapData,
  getAppTimeline,
  getAppDetail,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAppCategoryRules,
  setAppCategory,
  getCategoryStats,
  getAppLimits,
  setAppLimit,
  deleteAppLimit,
  getSettings,
  updateSettings,
  getMonthlyStats,
  getTopApps
} from './database'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ScreenLife',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    if (!(app as any).isQuiting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  createTray(mainWindow)
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()

  startTracking()
  startLimitChecker()

  setInterval(() => {
    const now = new Date()
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 2) {
      resetDailyNotifications()
    }
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as any).isQuiting = true
  stopTracking()
  stopLimitChecker()
  destroyTray()
  closeDatabase()
})

ipcMain.handle('stats:today', () => {
  const today = new Date().toISOString().split('T')[0]
  return getTodayStats(today)
})

ipcMain.handle('stats:today-total', () => {
  const today = new Date().toISOString().split('T')[0]
  return getTodayTotal(today)
})

ipcMain.handle('stats:hourly', () => {
  const today = new Date().toISOString().split('T')[0]
  return getHourlyStats(today)
})

ipcMain.handle('stats:week', (_e, startDate: string, endDate: string) => {
  return getWeekStats(startDate, endDate)
})

ipcMain.handle('stats:heatmap', (_e, startDate: string, endDate: string) => {
  return getHeatmapData(startDate, endDate)
})

ipcMain.handle('stats:category', (_e, date: string) => {
  return getCategoryStats(date)
})

ipcMain.handle('stats:top-apps', (_e, startDate: string, endDate: string, limit: number) => {
  return getTopApps(startDate, endDate, limit)
})

ipcMain.handle('stats:monthly', (_e, year: number, month: number) => {
  return getMonthlyStats(year, month)
})

ipcMain.handle('app:timeline', (_e, date: string, appName?: string) => {
  return getAppTimeline(date, appName)
})

ipcMain.handle('app:detail', (_e, appName: string, startDate: string, endDate: string) => {
  return getAppDetail(appName, startDate, endDate)
})

ipcMain.handle('categories:list', () => {
  return getCategories()
})

ipcMain.handle('categories:add', (_e, name: string, color: string, icon?: string) => {
  return addCategory(name, color, icon)
})

ipcMain.handle('categories:update', (_e, id: number, name: string, color: string, icon?: string) => {
  return updateCategory(id, name, color, icon)
})

ipcMain.handle('categories:delete', (_e, id: number) => {
  return deleteCategory(id)
})

ipcMain.handle('categories:rules', () => {
  return getAppCategoryRules()
})

ipcMain.handle('categories:set-app', (_e, appName: string, categoryId: number | null) => {
  return setAppCategory(appName, categoryId)
})

ipcMain.handle('limits:list', () => {
  return getAppLimits()
})

ipcMain.handle('limits:set', (_e, limit: any) => {
  return setAppLimit(limit)
})

ipcMain.handle('limits:delete', (_e, appName: string) => {
  return deleteAppLimit(appName)
})

ipcMain.handle('limits:remaining', (_e, appName: string) => {
  return getAppRemainingTime(appName)
})

ipcMain.handle('settings:get', () => {
  return getSettings()
})

ipcMain.handle('settings:update', (_e, settings: any) => {
  updateSettings(settings)
  refreshSettings()
  refreshTray()
  return getSettings()
})

ipcMain.handle('tracker:current', () => {
  return getCurrentActivity()
})

ipcMain.handle('tracker:is-active', () => {
  return isTrackingActive()
})

ipcMain.handle('export:csv', (_e, startDate?: string, endDate?: string, includeTitle?: boolean) => {
  return exportCSV(startDate, endDate, includeTitle)
})

ipcMain.handle('export:summary', (_e, date?: string) => {
  return exportSummary(date)
})

ipcMain.handle('window:show', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('window:hide', () => {
  mainWindow?.hide()
})
