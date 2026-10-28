import { useState, type FocusEvent, type MouseEvent } from 'react'

// Shared hover behavior for every chart. Each hoverable item gets `itemProps(index)`;
// the chart renders the tooltip from `current` so the content always comes from the
// hovered item's own data. `current` is kept after leaving so the tooltip can fade out
// showing the same content. `resetKey` clears hover when the underlying data changes.
export type AnchorMode = 'top' | 'end'

/** Where the tooltip points: x/y relative to the chart wrapper, plus half the hovered item's width. */
export interface ChartAnchor {
  x: number
  y: number
  halfWidth: number
}

interface HoverState {
  index: number
  anchor: ChartAnchor
  open: boolean
}

export function useChartHover({ resetKey }: { resetKey?: unknown } = {}) {
  const [container, setContainer] = useState<HTMLElement | null>(null) // callback ref target (the chart's `relative` wrapper)
  const [current, setCurrent] = useState<HoverState | null>(null)
  const [seenKey, setSeenKey] = useState(resetKey)

  // Clear hover when the chart's data changes (adjusting state during render, not in an effect).
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setCurrent(null)
  }

  // anchor 'top': dot sits on top-center of the item. 'end': right edge, vertically centered.
  const open = (index: number, el: HTMLElement, mode: AnchorMode) => {
    if (!container) return
    const target = el.querySelector<HTMLElement>('[data-anchor]') ?? el
    const t = target.getBoundingClientRect()
    const c = container.getBoundingClientRect()
    const anchor: ChartAnchor =
      mode === 'end'
        ? { x: t.right - c.left, y: t.top + t.height / 2 - c.top, halfWidth: 0 }
        : { x: t.left + t.width / 2 - c.left, y: t.top - c.top, halfWidth: t.width / 2 }
    setCurrent({ index, anchor, open: true })
  }
  const close = () => setCurrent((c) => (c ? { ...c, open: false } : c))

  const itemProps = (index: number, { anchor = 'top' }: { anchor?: AnchorMode } = {}) => ({
    tabIndex: 0,
    onMouseEnter: (e: MouseEvent<HTMLElement>) => open(index, e.currentTarget, anchor),
    onFocus: (e: FocusEvent<HTMLElement>) => open(index, e.currentTarget, anchor),
    onMouseLeave: close,
    onBlur: close,
  })

  return {
    bindContainer: setContainer,
    itemProps,
    isActive: (index: number) => Boolean(current?.open && current.index === index),
    visible: Boolean(current?.open),
    index: current?.index ?? null,
    anchor: current?.anchor ?? null,
  }
}
