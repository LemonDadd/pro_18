import { Notification } from 'electron'
import { getAppLimits, getTodayStats, getSettings } from './database'
import type { AppLimit } from '@shared/types'

interface LimitState {
  notifiedApps: Set<string>
  lockedApps: Set<string>
  lockUntil: Map<string, number>
  intervalId: NodeJS.Timeout | null
}

const state: LimitState = {
  notifiedApps: new Set(),
  lockedApps: new Set(),
  lockUntil: new Map(),
  intervalId: null
}

export function startLimitChecker() {
  if (state.intervalId) return

  state.intervalId = setInterval(checkLimits, 60000)
  console.log('[LimitChecker] Started')
}

export function stopLimitChecker() {
  if (state.intervalId) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }
}

function checkLimits() {
  const settings = getSettings()
  if (settings.paused) return

  const today = new Date().toISOString().split('T')[0]
  const stats = getTodayStats(today)
  const limits = getAppLimits()

  const limitMap = new Map<string, AppLimit>()
  for (const limit of limits) {
    if (limit.enabled) {
      limitMap.set(limit.appName, limit)
    }
  }

  const statMap = new Map<string, number>()
  for (const stat of stats) {
    statMap.set(stat.appName, stat.totalDuration)
  }

  const now = Date.now()

  for (const [appName, limit] of limitMap.entries()) {
    const usedSeconds = statMap.get(appName) || 0
    const limitSeconds = limit.dailyLimitMinutes * 60
    const remaining = limitSeconds - usedSeconds

    const lockEnd = state.lockUntil.get(appName) || 0
    if (now < lockEnd) {
      continue
    } else if (state.lockedApps.has(appName)) {
      state.lockedApps.delete(appName)
    }

    if (remaining <= 0 && usedSeconds > 0) {
      if (!state.lockedApps.has(appName)) {
        handleLimitExceeded(appName, limit)
        state.lockedApps.add(appName)

        if (limit.action === 'lock' && limit.lockDurationMinutes) {
          state.lockUntil.set(appName, now + limit.lockDurationMinutes * 60 * 1000)
        }
      }
    } else if (remaining <= limitSeconds * 0.1 && !state.notifiedApps.has(appName)) {
      handleWarning(appName, remaining, limit)
      state.notifiedApps.add(appName)
    }
  }
}

function handleWarning(appName: string, remainingSeconds: number, limit: AppLimit) {
  const minutesLeft = Math.ceil(remainingSeconds / 60)

  new Notification({
    title: 'ScreenLife 限额提醒',
    body: `${appName} 今日剩余使用时间约 ${minutesLeft} 分钟`,
    silent: false
  }).show()

  console.log(`[LimitChecker] Warning: ${appName} has ${minutesLeft} minutes left`)
}

function handleLimitExceeded(appName: string, limit: AppLimit) {
  if (limit.action === 'lock') {
    new Notification({
      title: 'ScreenLife 强制休息',
      body: `${appName} 已达今日限额，强制休息 ${limit.lockDurationMinutes || 5} 分钟`,
      silent: false
    }).show()

    console.log(`[LimitChecker] Locking ${appName} for ${limit.lockDurationMinutes || 5} minutes`)
  } else {
    new Notification({
      title: 'ScreenLife 时间提醒',
      body: `${appName} 已达今日使用限额`,
      silent: false
    }).show()

    console.log(`[LimitChecker] Limit exceeded: ${appName}`)
  }
}

export function resetDailyNotifications() {
  state.notifiedApps.clear()
  state.lockedApps.clear()
  state.lockUntil.clear()
}

export function isAppLocked(appName: string): boolean {
  const lockEnd = state.lockUntil.get(appName) || 0
  return Date.now() < lockEnd
}

export function getAppRemainingTime(appName: string): number {
  const today = new Date().toISOString().split('T')[0]
  const stats = getTodayStats(today)
  const limits = getAppLimits()

  const limit = limits.find(l => l.appName === appName)
  if (!limit || !limit.enabled) return -1

  const stat = stats.find(s => s.appName === appName)
  const used = stat?.totalDuration || 0

  return Math.max(0, limit.dailyLimitMinutes * 60 - used)
}
