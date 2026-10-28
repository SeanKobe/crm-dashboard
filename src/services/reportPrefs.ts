import { mirrorPref } from './userPrefs'
import type { ReportPrefs, ReportRangeId } from '../types'

// Reports page preferences (date range and the compare toggle). Stays on the device.
const KEY = 'crm.reports.prefs.v1'
const RANGES: ReportRangeId[] = ['month', '30d', 'quarter', 'year', 'custom']
const DATE = /^\d{4}-\d{2}-\d{2}$/
export const defaultReportPrefs: ReportPrefs = { range: 'month', from: '', to: '', compare: true }

export function loadReportPrefs(): ReportPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultReportPrefs
    const p = JSON.parse(raw) as Partial<ReportPrefs>
    return {
      range: p.range && RANGES.includes(p.range) ? p.range : defaultReportPrefs.range,
      from: typeof p.from === 'string' && DATE.test(p.from) ? p.from : '',
      to: typeof p.to === 'string' && DATE.test(p.to) ? p.to : '',
      compare: typeof p.compare === 'boolean' ? p.compare : defaultReportPrefs.compare,
    }
  } catch {
    return defaultReportPrefs
  }
}

export function saveReportPrefs(patch: Partial<ReportPrefs>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadReportPrefs(), ...patch })) } catch { /* ignore */ }
  mirrorPref('reports')
}
