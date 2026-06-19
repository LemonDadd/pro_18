import { app, dialog, shell } from 'electron'
import { exportActivities, getTopApps, getCategoryStats, getWeekStats } from './database'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import * as fs from 'fs'
import * as path from 'path'

export async function exportCSV(startDate?: string, endDate?: string, includeTitle?: boolean) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultEnd = endDate || today
  const defaultStart = startDate || subDays(new Date(), 6).toISOString().split('T')[0]
  const includeTitles = includeTitle ?? false

  const result = await dialog.showSaveDialog({
    title: '导出 CSV',
    defaultPath: path.join(app.getPath('downloads'), `screenlife-${defaultStart}_${defaultEnd}.csv`),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })

  if (result.canceled || !result.filePath) return null

  const data = exportActivities(defaultStart, defaultEnd, includeTitles) as any[]

  const headers = includeTitles
    ? ['开始时间', '结束时间', '时长(秒)', '应用', '窗口标题', '日期']
    : ['开始时间', '结束时间', '时长(秒)', '应用', '日期']

  const csvLines = [headers.join(',')]

  for (const row of data) {
    const startTime = new Date(row.start_time * 1000).toISOString()
    const endTime = new Date(row.end_time * 1000).toISOString()
    const values = includeTitles
      ? [startTime, endTime, row.duration, `"${row.app_name}"`, `"${row.window_title.replace(/"/g, '""')}"`, row.date]
      : [startTime, endTime, row.duration, `"${row.app_name}"`, row.date]
    csvLines.push(values.join(','))
  }

  fs.writeFileSync(result.filePath, '\uFEFF' + csvLines.join('\n'), 'utf-8')
  shell.showItemInFolder(result.filePath)

  return result.filePath
}

export async function exportSummary(date?: string) {
  const targetDate = date || format(new Date(), 'yyyy-MM-dd')

  const result = await dialog.showSaveDialog({
    title: '导出汇总报告',
    defaultPath: path.join(app.getPath('downloads'), `screenlife-summary-${targetDate}.txt`),
    filters: [{ name: 'Text', extensions: ['txt'] }]
  })

  if (result.canceled || !result.filePath) return null

  const todayStats = getTopApps(targetDate, targetDate, 20)
  const categoryStats = getCategoryStats(targetDate)

  const totalSeconds = todayStats.reduce((sum, s) => sum + s.totalSeconds, 0)
  const totalHours = Math.floor(totalSeconds / 3600)
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60)

  const lines: string[] = []
  lines.push('='.repeat(50))
  lines.push('  ScreenLife 日报告')
  lines.push(`  日期: ${targetDate}`)
  lines.push('='.repeat(50))
  lines.push('')
  lines.push(`总屏幕时间: ${totalHours}小时${totalMinutes}分钟`)
  lines.push('')
  lines.push('--- 应用排行 ---')
  for (let i = 0; i < todayStats.length; i++) {
    const app = todayStats[i]
    const hours = Math.floor(app.totalSeconds / 3600)
    const mins = Math.floor((app.totalSeconds % 3600) / 60)
    lines.push(`${i + 1}. ${app.appName} - ${hours}h${mins}m`)
  }
  lines.push('')
  lines.push('--- 分类统计 ---')
  for (const cat of categoryStats) {
    const hours = Math.floor(cat.totalSeconds / 3600)
    const mins = Math.floor((cat.totalSeconds % 3600) / 60)
    const percent = totalSeconds > 0 ? ((cat.totalSeconds / totalSeconds) * 100).toFixed(1) : '0'
    lines.push(`${cat.categoryName}: ${hours}h${mins}m (${percent}%)`)
  }
  lines.push('')
  lines.push('='.repeat(50))

  fs.writeFileSync(result.filePath, lines.join('\n'), 'utf-8')
  shell.showItemInFolder(result.filePath)

  return result.filePath
}
