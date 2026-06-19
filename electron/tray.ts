import { Tray, Menu, BrowserWindow, nativeImage } from 'electron'
import { getTodayStats, getSettings, updateSettings } from './database'
import { format } from 'date-fns'
import path from 'path'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null

export function createTray(window: BrowserWindow) {
  mainWindow = window

  const iconPath = path.join(__dirname, '../assets/tray.png')
  const trayIcon = nativeImage.createEmpty()

  tray = new Tray(trayIcon)
  tray.setTitle('0h 0m')

  updateTrayTooltip()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 ScreenLife',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '今日总时长: 计算中...',
      enabled: false,
      id: 'today-total'
    },
    { type: 'separator' },
    {
      label: '暂停追踪',
      type: 'checkbox',
      id: 'pause-toggle',
      click: async () => {
        const settings = getSettings()
        updateSettings({ paused: !settings.paused })
        updateTrayMenu()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        process.exit(0)
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  setInterval(updateTrayDisplay, 60000)
  updateTrayDisplay()

  return tray
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

function updateTrayDisplay() {
  if (!tray) return

  const today = format(new Date(), 'yyyy-MM-dd')
  const stats = getTodayStats(today)
  const total = stats.reduce((sum, s) => sum + s.totalDuration, 0)

  tray.setTitle(formatDuration(total))
  updateTrayTooltip()
  updateTrayMenu()
}

function updateTrayTooltip() {
  if (!tray) return

  const today = format(new Date(), 'yyyy-MM-dd')
  const stats = getTodayStats(today)
  const total = stats.reduce((sum, s) => sum + s.totalDuration, 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)

  let tooltip = `ScreenLife - 今日 ${hours}小时${minutes}分钟\n\n`
  const top5 = stats.slice(0, 5)
  for (const s of top5) {
    const h = Math.floor(s.totalDuration / 3600)
    const m = Math.floor((s.totalDuration % 3600) / 60)
    tooltip += `${s.appName}: ${h}h${m}m\n`
  }

  tray.setToolTip(tooltip)
}

function updateTrayMenu() {
  if (!tray) return

  const today = format(new Date(), 'yyyy-MM-dd')
  const stats = getTodayStats(today)
  const total = stats.reduce((sum, s) => sum + s.totalDuration, 0)
  const settings = getSettings()

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 ScreenLife',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: `今日总时长: ${formatDuration(total)}`,
      enabled: false
    },
    ...stats.slice(0, 5).map(s => ({
      label: `  ${s.appName}: ${formatDuration(s.totalDuration)}`,
      enabled: false
    })),
    { type: 'separator' },
    {
      label: settings.paused ? '继续追踪' : '暂停追踪',
      type: 'checkbox',
      checked: settings.paused,
      click: () => {
        const currentSettings = getSettings()
        updateSettings({ paused: !currentSettings.paused })
        updateTrayDisplay()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        process.exit(0)
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

export function refreshTray() {
  updateTrayDisplay()
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
