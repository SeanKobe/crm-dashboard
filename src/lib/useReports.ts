import { useEffect, useRef, useState } from 'react'
import { configureReportsService, reportsService, subscribeReports } from '../services/reports'
import type { ReportData, ReportPrefs } from '../types'

// Data hook for the Reports page. It only talks to the reports service, and reloads when deals, contacts or events change.
export type ReportsStatus = 'loading' | 'ready' | 'error'

export interface UseReports {
  data: ReportData | null
  status: ReportsStatus
  error: string | null
  reload: () => void
}

let firstLoadDone = false
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function useReports(prefs: Pick<ReportPrefs, 'range' | 'from' | 'to' | 'compare'>, { minLoadMs = 0, simulateError }: { minLoadMs?: number; simulateError?: boolean } = {}): UseReports {
  const [data, setData] = useState<ReportData | null>(null)
  const [status, setStatus] = useState<ReportsStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const prefsRef = useRef(prefs)
  useEffect(() => { prefsRef.current = prefs })
  const { range, from, to, compare } = prefs

  useEffect(() => {
    let live = true
    if (simulateError !== undefined) configureReportsService({ failReads: simulateError })
    const wait = !firstLoadDone && minLoadMs ? sleep(minLoadMs) : Promise.resolve()
    Promise.all([reportsService.get(prefsRef.current), wait])
      .then(([report]) => { if (!live) return; firstLoadDone = true; setData(report); setError(null); setStatus('ready') })
      .catch((e: unknown) => { if (!live) return; setError(e instanceof Error ? e.message : 'Could not load reports.'); setStatus('error') })
    return () => { live = false }
  }, [range, from, to, compare, minLoadMs, simulateError, tick])

  // A write to deals, contacts or events changes the numbers: recompute quietly (no loading state, so the page doesn't flash).
  useEffect(() => subscribeReports(() => {
    reportsService.get(prefsRef.current).then(setData).catch(() => undefined)
  }), [])
  return { data, status, error, reload: () => { setStatus('loading'); setTick((t) => t + 1) } }
}
