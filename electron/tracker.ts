import { getActiveWindow, isScreenLocked, getIdleTime, type ActiveWindow } from './active-window'
import {
  insertActivity,
  updateActivityEnd,
  upsertDailyStat,
  getSettings
} from './database'
import { format } from 'date-fns'
import type { Settings } from '@shared/types'

interface TrackingState {
  currentActivity: {
    id: number
    appName: string
    windowTitle: string
    startTime: number
    lastUpdateTime: number
  } | null
  isTracking: boolean
  intervalId: NodeJS.Timeout | null
  settings: Settings | null
  listeners: Set<(state: any) => void>
}

const state: TrackingState = {
  currentActivity: null,
  isTracking: false,
  intervalId: null,
  settings: null,
  listeners: new Set()
}

export function startTracking() {
  if (state.isTracking) return

  state.settings = getSettings()
  state.isTracking = true
  state.intervalId = setInterval(tick, 1000)

  console.log('[Tracker] Tracking started')
}

export function stopTracking() {
  if (!state.isTracking) return

  state.isTracking = false
  if (state.intervalId) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }

  if (state.currentActivity) {
    const now = Date.now() / 1000
    updateActivityEnd(
      state.currentActivity.id,
      Math.floor(now),
      Math.floor(now - state.currentActivity.startTime)
    )
    state.currentActivity = null
  }

  console.log('[Tracker] Tracking stopped')
}

export function refreshSettings() {
  state.settings = getSettings()
}

function getDateString(ts: number): string {
  return format(new Date(ts * 1000), 'yyyy-MM-dd')
}

async function tick() {
  if (!state.settings) return

  if (state.settings.paused) {
    if (state.currentActivity) {
      const now = Math.floor(Date.now() / 1000)
      updateActivityEnd(
        state.currentActivity.id,
        now,
        now - state.currentActivity.startTime
      )
      state.currentActivity = null
    }
    return
  }

  const idleTime = await getIdleTime()
  const isIdle = idleTime > state.settings.idleThresholdSeconds

  if (isIdle) {
    if (state.currentActivity) {
      const now = Math.floor(Date.now() / 1000)
      updateActivityEnd(
        state.currentActivity.id,
        now,
        now - state.currentActivity.startTime
      )
      state.currentActivity = null
    }
    return
  }

  const locked = await isScreenLocked()
  if (locked) {
    if (state.currentActivity) {
      const now = Math.floor(Date.now() / 1000)
      updateActivityEnd(
        state.currentActivity.id,
        now,
        now - state.currentActivity.startTime
      )
      state.currentActivity = null
    }
    return
  }

  let activeWindow: ActiveWindow
  try {
    activeWindow = await getActiveWindow()
  } catch {
    return
  }

  if (state.settings.blacklistedApps.includes(activeWindow.appName)) {
    if (state.currentActivity) {
      const now = Math.floor(Date.now() / 1000)
      updateActivityEnd(
        state.currentActivity.id,
        now,
        now - state.currentActivity.startTime
      )
      state.currentActivity = null
    }
    return
  }

  let windowTitle = activeWindow.windowTitle
  if (!state.settings.recordWindowTitle) {
    windowTitle = ''
  } else if (windowTitle.length > state.settings.windowTitleMaxLength) {
    windowTitle = windowTitle.slice(0, state.settings.windowTitleMaxLength)
  }

  const now = Math.floor(Date.now() / 1000)

  if (state.currentActivity) {
    const sameApp = state.currentActivity.appName === activeWindow.appName
    const sameTitle = state.currentActivity.windowTitle === windowTitle

    if (sameApp && sameTitle) {
      state.currentActivity.lastUpdateTime = now
      return
    }

    const duration = now - state.currentActivity.startTime
    if (duration > 0) {
      updateActivityEnd(state.currentActivity.id, now, duration)
      upsertDailyStat(
        state.currentActivity.appName,
        getDateString(state.currentActivity.startTime),
        duration
      )
    }

    const newId = insertActivity({
      appName: activeWindow.appName,
      windowTitle: windowTitle,
      startTime: now,
      endTime: now,
      duration: 0,
      date: getDateString(now)
    })

    state.currentActivity = {
      id: newId,
      appName: activeWindow.appName,
      windowTitle: windowTitle,
      startTime: now,
      lastUpdateTime: now
    }
  } else {
    const newId = insertActivity({
      appName: activeWindow.appName,
      windowTitle: windowTitle,
      startTime: now,
      endTime: now,
      duration: 0,
      date: getDateString(now)
    })

    state.currentActivity = {
      id: newId,
      appName: activeWindow.appName,
      windowTitle: windowTitle,
      startTime: now,
      lastUpdateTime: now
    }
  }
}

export function getCurrentActivity() {
  if (!state.currentActivity) return null
  return {
    appName: state.currentActivity.appName,
    windowTitle: state.currentActivity.windowTitle,
    startTime: state.currentActivity.startTime
  }
}

export function isTrackingActive(): boolean {
  return state.isTracking
}

export function subscribeTracking(callback: (state: any) => void) {
  state.listeners.add(callback)
  return () => state.listeners.delete(callback)
}
