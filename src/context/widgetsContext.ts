import { createContext, useContext } from 'react'
import type { WidgetId } from '../types'

// Which dashboard widgets are visible. `hide`, `show`, `toggle` and `reset` all animate through WidgetGrid.
export interface WidgetsValue {
  hidden: WidgetId[]
  hide: (id: WidgetId) => void
  show: (id: WidgetId) => void
  toggle: (id: WidgetId) => void
  reset: () => void
  /** Bumped per widget by `refresh`, used as a React key to replay the entrance animation. */
  refreshKey: Partial<Record<WidgetId, number>>
  refresh: (id: WidgetId) => void
}

export const WidgetsContext = createContext<WidgetsValue>({ hidden: [], hide() {}, show() {}, toggle() {}, reset() {}, refreshKey: {}, refresh() {} })
export const useWidgets = () => useContext(WidgetsContext)
