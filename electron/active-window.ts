import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ActiveWindow {
  appName: string
  windowTitle: string
  bundleId?: string
}

export async function getActiveWindow(): Promise<ActiveWindow> {
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set bundleId to bundle identifier of frontApp
        try
          set winTitle to name of front window of frontApp
        on error
          set winTitle to ""
        end try
        return appName & "||" & bundleId & "||" & winTitle
      end tell
    `

    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`)
    const parts = stdout.trim().split('||')

    return {
      appName: parts[0] || 'Unknown',
      bundleId: parts[1] || undefined,
      windowTitle: parts[2] || ''
    }
  } catch (error) {
    console.error('Failed to get active window:', error)
    return {
      appName: 'Unknown',
      windowTitle: ''
    }
  }
}

export async function isScreenLocked(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        try
          get name of first application process whose frontmost is true
          return false
        on error
          return true
        end try
      end tell
    `
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    return stdout.trim() === 'true'
  } catch {
    return false
  }
}

export async function getIdleTime(): Promise<number> {
  try {
    const script = `
      set idleTime to do shell script "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'"
      return idleTime
    `
    const { stdout } = await execAsync(`osascript -e '${script}'`)
    return parseFloat(stdout.trim()) || 0
  } catch {
    return 0
  }
}
