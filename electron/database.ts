import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import type {
  WindowActivity,
  AppDailyStat,
  Category,
  AppCategoryRule,
  AppLimit,
  Settings,
  DayStat,
  HourlyStat,
  HeatmapCell,
  AppTimelineItem
} from '@shared/types'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'screenlife.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedInitialData()

  return db
}

function createTables() {
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS window_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      window_title TEXT NOT NULL DEFAULT '',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      date TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON window_activities(date);
    CREATE INDEX IF NOT EXISTS idx_activities_app ON window_activities(app_name);
    CREATE INDEX IF NOT EXISTS idx_activities_start ON window_activities(start_time);

    CREATE TABLE IF NOT EXISTS app_daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      date TEXT NOT NULL,
      total_duration INTEGER NOT NULL DEFAULT 0,
      UNIQUE(app_name, date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON app_daily_stats(date);

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS app_category_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL UNIQUE,
      bundle_id TEXT,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL UNIQUE,
      daily_limit_minutes INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      action TEXT NOT NULL DEFAULT 'notify',
      lock_duration_minutes INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      record_window_title INTEGER NOT NULL DEFAULT 0,
      window_title_max_length INTEGER NOT NULL DEFAULT 100,
      idle_threshold_seconds INTEGER NOT NULL DEFAULT 60,
      auto_start INTEGER NOT NULL DEFAULT 0,
      paused INTEGER NOT NULL DEFAULT 0,
      blacklisted_apps TEXT NOT NULL DEFAULT '[]'
    );
  `)
}

function seedInitialData() {
  if (!db) return

  const database = db

  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count === 0) {
    const insertCategory = database.prepare(
      'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)'
    )

    const defaultCategories: [string, string, string][] = [
      ['工作', '#3b82f6', 'briefcase'],
      ['学习', '#10b981', 'book'],
      ['娱乐', '#f59e0b', 'gamepad'],
      ['社交', '#ec4899', 'users'],
      ['工具', '#8b5cf6', 'wrench'],
      ['浏览器', '#06b6d4', 'globe'],
      ['其他', '#6b7280', 'more-horizontal'],
    ]

    const insertRule = database.prepare(
      'INSERT INTO app_category_rules (app_name, category_id) VALUES (?, ?)'
    )

    const defaultRules: [string, string][] = [
      ['Code', '工作'],
      ['Visual Studio Code', '工作'],
      ['Xcode', '工作'],
      ['Android Studio', '工作'],
      ['IntelliJ IDEA', '工作'],
      ['WebStorm', '工作'],
      ['iTerm2', '工具'],
      ['Terminal', '工具'],
      ['Google Chrome', '浏览器'],
      ['Safari', '浏览器'],
      ['Firefox', '浏览器'],
      ['Microsoft Edge', '浏览器'],
      ['微信', '社交'],
      ['WeChat', '社交'],
      ['QQ', '社交'],
      ['钉钉', '社交'],
      ['DingTalk', '社交'],
      ['飞书', '社交'],
      ['Lark', '社交'],
      ['Slack', '社交'],
      ['Discord', '社交'],
      ['网易云音乐', '娱乐'],
      ['QQ音乐', '娱乐'],
      ['Spotify', '娱乐'],
      ['哔哩哔哩', '娱乐'],
      ['bilibili', '娱乐'],
      ['YouTube', '娱乐'],
      ['Netflix', '娱乐'],
      ['Finder', '工具'],
      ['预览', '工具'],
      ['系统设置', '工具'],
    ]

    const transaction = database.transaction(() => {
      for (const [name, color, icon] of defaultCategories) {
        insertCategory.run(name, color, icon)
      }

      const getCategoryId = database.prepare('SELECT id FROM categories WHERE name = ?')
      for (const [appName, categoryName] of defaultRules) {
        const cat = getCategoryId.get(categoryName) as { id: number } | undefined
        if (cat) {
          insertRule.run(appName, cat.id)
        }
      }
    })

    transaction()
  }

  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }
  if (settingsCount.count === 0) {
    database.prepare(
      'INSERT INTO settings (id, record_window_title, window_title_max_length, idle_threshold_seconds, auto_start, paused, blacklisted_apps) VALUES (1, 0, 100, 60, 0, 0, ?)'
    ).run(JSON.stringify(['1Password', '钥匙串访问', 'Keychain Access']))
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}

export function insertActivity(activity: Omit<WindowActivity, 'id'>): number {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(
    'INSERT INTO window_activities (app_name, window_title, start_time, end_time, duration, date) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const result = stmt.run(
    activity.appName,
    activity.windowTitle,
    activity.startTime,
    activity.endTime,
    activity.duration,
    activity.date
  )
  return Number(result.lastInsertRowid)
}

export function updateActivityEnd(id: number, endTime: number, duration: number) {
  if (!db) throw new Error('Database not initialized')
  db.prepare(
    'UPDATE window_activities SET end_time = ?, duration = ? WHERE id = ?'
  ).run(endTime, duration, id)
}

export function upsertDailyStat(appName: string, date: string, durationToAdd: number) {
  if (!db) throw new Error('Database not initialized')
  db.prepare(`
    INSERT INTO app_daily_stats (app_name, date, total_duration)
    VALUES (?, ?, ?)
    ON CONFLICT(app_name, date) DO UPDATE SET
      total_duration = total_duration + excluded.total_duration
  `).run(appName, date, durationToAdd)
}

export function getTodayStats(date: string): AppDailyStat[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT s.app_name, s.date, s.total_duration, c.name as category, c.color as category_color
    FROM app_daily_stats s
    LEFT JOIN app_category_rules r ON s.app_name = r.app_name
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE s.date = ?
    ORDER BY s.total_duration DESC
  `).all(date) as any[]

  return rows.map(row => ({
    appName: row.app_name,
    date: row.date,
    totalDuration: row.total_duration,
    category: row.category,
    categoryColor: row.category_color
  }))
}

export function getTodayTotal(date: string): number {
  if (!db) throw new Error('Database not initialized')
  const result = db.prepare(`
    SELECT COALESCE(SUM(total_duration), 0) as total
    FROM app_daily_stats
    WHERE date = ?
  `).get(date) as { total: number }
  return result.total
}

export function getHourlyStats(date: string): HourlyStat[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT 
      CAST(strftime('%H', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      SUM(duration) as total_seconds
    FROM window_activities
    WHERE date = ?
    GROUP BY hour
    ORDER BY hour
  `).all(date) as any[]

  return rows.map(row => ({
    hour: row.hour,
    totalSeconds: row.total_seconds
  }))
}

export function getWeekStats(startDate: string, endDate: string): DayStat[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT date, SUM(total_duration) as total_seconds
    FROM app_daily_stats
    WHERE date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date
  `).all(startDate, endDate) as any[]

  return rows.map(row => ({
    date: row.date,
    totalSeconds: row.total_seconds
  }))
}

export function getHeatmapData(startDate: string, endDate: string): HeatmapCell[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT
      CAST(strftime('%w', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) as day,
      CAST(strftime('%H', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      SUM(duration) as value
    FROM window_activities
    WHERE date >= ? AND date <= ?
    GROUP BY day, hour
  `).all(startDate, endDate) as any[]

  return rows.map(row => ({
    day: row.day,
    hour: row.hour,
    value: row.value
  }))
}

export function getAppTimeline(date: string, appName?: string): AppTimelineItem[] {
  if (!db) throw new Error('Database not initialized')
  let query = `
    SELECT app_name, window_title, start_time, end_time, duration
    FROM window_activities
    WHERE date = ?
  `
  const params: any[] = [date]

  if (appName) {
    query += ' AND app_name = ?'
    params.push(appName)
  }

  query += ' ORDER BY start_time ASC'

  const rows = db.prepare(query).all(...params) as any[]
  return rows.map(row => ({
    appName: row.app_name,
    windowTitle: row.window_title,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration
  }))
}

export function getAppDetail(appName: string, startDate: string, endDate: string) {
  if (!db) throw new Error('Database not initialized')
  const totalResult = db.prepare(`
    SELECT SUM(total_duration) as total_seconds, COUNT(*) as days
    FROM app_daily_stats
    WHERE app_name = ? AND date >= ? AND date <= ?
  `).get(appName, startDate, endDate) as { total_seconds: number; days: number }

  const dailyStats = db.prepare(`
    SELECT date, total_duration
    FROM app_daily_stats
    WHERE app_name = ? AND date >= ? AND date <= ?
    ORDER BY date
  `).all(appName, startDate, endDate) as any[]

  const topTitles = db.prepare(`
    SELECT window_title, SUM(duration) as total_seconds
    FROM window_activities
    WHERE app_name = ? AND date >= ? AND date <= ? AND window_title != ''
    GROUP BY window_title
    ORDER BY total_seconds DESC
    LIMIT 10
  `).all(appName, startDate, endDate) as any[]

  const peakHour = db.prepare(`
    SELECT
      CAST(strftime('%H', datetime(start_time, 'unixepoch', 'localtime')) AS INTEGER) as hour,
      SUM(duration) as total_seconds
    FROM window_activities
    WHERE app_name = ? AND date >= ? AND date <= ?
    GROUP BY hour
    ORDER BY total_seconds DESC
    LIMIT 1
  `).get(appName, startDate, endDate) as { hour: number; total_seconds: number } | undefined

  return {
    totalSeconds: totalResult.total_seconds || 0,
    days: totalResult.days || 0,
    dailyStats: dailyStats.map(r => ({ date: r.date, totalSeconds: r.total_duration })),
    topTitles: topTitles.map(r => ({ title: r.window_title, totalSeconds: r.total_seconds })),
    peakHour: peakHour?.hour ?? -1
  }
}

export function getCategories(): Category[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare('SELECT * FROM categories ORDER BY id').all() as any[]
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon
  }))
}

export function addCategory(name: string, color: string, icon?: string): number {
  if (!db) throw new Error('Database not initialized')
  const result = db.prepare(
    'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)'
  ).run(name, color, icon || null)
  return Number(result.lastInsertRowid)
}

export function updateCategory(id: number, name: string, color: string, icon?: string) {
  if (!db) throw new Error('Database not initialized')
  db.prepare(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?'
  ).run(name, color, icon || null, id)
}

export function deleteCategory(id: number) {
  if (!db) throw new Error('Database not initialized')
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

export function getAppCategoryRules(): (AppCategoryRule & { categoryName?: string; categoryColor?: string })[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT r.*, c.name as category_name, c.color as category_color
    FROM app_category_rules r
    LEFT JOIN categories c ON r.category_id = c.id
    ORDER BY r.app_name
  `).all() as any[]

  return rows.map(row => ({
    id: row.id,
    appName: row.app_name,
    bundleId: row.bundle_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color
  }))
}

export function setAppCategory(appName: string, categoryId: number | null) {
  if (!db) throw new Error('Database not initialized')
  db.prepare(`
    INSERT INTO app_category_rules (app_name, category_id)
    VALUES (?, ?)
    ON CONFLICT(app_name) DO UPDATE SET category_id = excluded.category_id
  `).run(appName, categoryId)
}

export function getCategoryStats(date: string) {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT 
      COALESCE(c.name, '其他') as category_name,
      COALESCE(c.color, '#6b7280') as category_color,
      SUM(s.total_duration) as total_seconds
    FROM app_daily_stats s
    LEFT JOIN app_category_rules r ON s.app_name = r.app_name
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE s.date = ?
    GROUP BY c.id, c.name, c.color
    ORDER BY total_seconds DESC
  `).all(date) as any[]

  return rows.map(row => ({
    categoryName: row.category_name,
    categoryColor: row.category_color,
    totalSeconds: row.total_seconds
  }))
}

export function getAppLimits(): AppLimit[] {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare('SELECT * FROM app_limits ORDER BY app_name').all() as any[]
  return rows.map(row => ({
    id: row.id,
    appName: row.app_name,
    dailyLimitMinutes: row.daily_limit_minutes,
    enabled: row.enabled === 1,
    action: row.action,
    lockDurationMinutes: row.lock_duration_minutes
  }))
}

export function setAppLimit(limit: Omit<AppLimit, 'id'>): number {
  if (!db) throw new Error('Database not initialized')
  const result = db.prepare(`
    INSERT INTO app_limits (app_name, daily_limit_minutes, enabled, action, lock_duration_minutes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(app_name) DO UPDATE SET
      daily_limit_minutes = excluded.daily_limit_minutes,
      enabled = excluded.enabled,
      action = excluded.action,
      lock_duration_minutes = excluded.lock_duration_minutes
  `).run(
    limit.appName,
    limit.dailyLimitMinutes,
    limit.enabled ? 1 : 0,
    limit.action,
    limit.lockDurationMinutes ?? 5
  )
  return Number(result.lastInsertRowid)
}

export function deleteAppLimit(appName: string) {
  if (!db) throw new Error('Database not initialized')
  db.prepare('DELETE FROM app_limits WHERE app_name = ?').run(appName)
}

export function getSettings(): Settings {
  if (!db) throw new Error('Database not initialized')
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any
  return {
    recordWindowTitle: row.record_window_title === 1,
    windowTitleMaxLength: row.window_title_max_length,
    idleThresholdSeconds: row.idle_threshold_seconds,
    autoStart: row.auto_start === 1,
    paused: row.paused === 1,
    blacklistedApps: JSON.parse(row.blacklisted_apps || '[]')
  }
}

export function updateSettings(settings: Partial<Settings>) {
  if (!db) throw new Error('Database not initialized')

  const current = getSettings()
  const merged = { ...current, ...settings }

  db.prepare(`
    UPDATE settings SET
      record_window_title = ?,
      window_title_max_length = ?,
      idle_threshold_seconds = ?,
      auto_start = ?,
      paused = ?,
      blacklisted_apps = ?
    WHERE id = 1
  `).run(
    merged.recordWindowTitle ? 1 : 0,
    merged.windowTitleMaxLength,
    merged.idleThresholdSeconds,
    merged.autoStart ? 1 : 0,
    merged.paused ? 1 : 0,
    JSON.stringify(merged.blacklistedApps)
  )
}

export function getMonthlyStats(year: number, month: number): DayStat[] {
  if (!db) throw new Error('Database not initialized')
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const rows = db.prepare(`
    SELECT date, SUM(total_duration) as total_seconds
    FROM app_daily_stats
    WHERE date LIKE ?
    GROUP BY date
    ORDER BY date
  `).all(`${monthStr}%`) as any[]

  return rows.map(row => ({
    date: row.date,
    totalSeconds: row.total_seconds
  }))
}

export function getTopApps(startDate: string, endDate: string, limit: number = 10) {
  if (!db) throw new Error('Database not initialized')
  const rows = db.prepare(`
    SELECT s.app_name, SUM(s.total_duration) as total_seconds, c.name as category, c.color as category_color
    FROM app_daily_stats s
    LEFT JOIN app_category_rules r ON s.app_name = r.app_name
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE s.date >= ? AND s.date <= ?
    GROUP BY s.app_name
    ORDER BY total_seconds DESC
    LIMIT ?
  `).all(startDate, endDate, limit) as any[]

  return rows.map(row => ({
    appName: row.app_name,
    totalSeconds: row.total_seconds,
    category: row.category,
    categoryColor: row.category_color
  }))
}

export function exportActivities(startDate: string, endDate: string, includeTitle: boolean) {
  if (!db) throw new Error('Database not initialized')
  const query = includeTitle
    ? `SELECT start_time, end_time, duration, app_name, window_title, date FROM window_activities WHERE date >= ? AND date <= ? ORDER BY start_time`
    : `SELECT start_time, end_time, duration, app_name, date FROM window_activities WHERE date >= ? AND date <= ? ORDER BY start_time`

  return db.prepare(query).all(startDate, endDate)
}
