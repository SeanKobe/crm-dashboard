import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { WidgetId } from '../types'
import { WidgetsContext, type WidgetsValue } from './widgetsContext'

export function WidgetsProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<WidgetId[]>([])
  const [refreshKey, setRefreshKey] = useState<WidgetsValue['refreshKey']>({})
  const hide = useCallback((id: WidgetId) => setHidden((h) => (h.includes(id) ? h : [...h, id])), [])
  const show = useCallback((id: WidgetId) => setHidden((h) => h.filter((x) => x !== id)), [])
  const toggle = useCallback((id: WidgetId) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id])), [])
  const reset = useCallback(() => setHidden([]), [])
  // "Refresh" on a widget re-runs its entrance animation by bumping a key.
  const refresh = useCallback((id: WidgetId) => setRefreshKey((k) => ({ ...k, [id]: (k[id] ?? 0) + 1 })), [])
  const value = useMemo<WidgetsValue>(() => ({ hidden, hide, show, toggle, reset, refreshKey, refresh }), [hidden, hide, show, toggle, reset, refreshKey, refresh])
  return <WidgetsContext.Provider value={value}>{children}</WidgetsContext.Provider>
}
