import { useLoaded } from '../../context/loadedContext'
import { MAP_SIZE, mapDots } from '../../data/mapDots'
import { cn } from '../../lib/cn'
import { useInView } from '../../lib/useInView'
import type { CountryKey } from '../../types'

// Dot-matrix map from the Figma Top Country card (same points). Dots fade in progressively. The hovered country
// (from the list or from the map) turns solid purple with a soft pulse while the other dots recede.
export interface CountryMapProps {
  /** The highlighted country, if any. */
  active: CountryKey | null
  onHover?: (country: CountryKey | null) => void
}

export function CountryMap({ active, onHover }: CountryMapProps) {
  const loaded = useLoaded()
  const { ref, inView } = useInView({ enabled: loaded })
  const drawn = loaded && inView
  return (
    <div ref={ref} className="relative h-[215px] w-32 shrink-0 overflow-hidden rounded-lg bg-primary-soft">
      <svg viewBox={`0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}`} className="size-full" role="img" aria-label="Map of Southeast Asia and Australia" onMouseLeave={() => onHover?.(null)} onMouseMove={(e) => {
          const c = (e.target as SVGElement).dataset?.c
          if (c !== undefined) onHover?.(c === 'other' ? null : (c as CountryKey))
        }}>
        {mapDots.map(([x, y, c], i) => {
          const hit = active === c
          return (
            <circle
              key={i}
              data-c={c}
              cx={x}
              cy={y}
              r={1.4}
              className={cn('fill-primary transition-[opacity,fill] duration-chart ease-out', c === 'other' ? 'opacity-30' : 'opacity-100', hit && 'animate-pulse-dot [transform-box:fill-box] [transform-origin:center]')}
              style={{ opacity: !drawn ? 0 : active && !hit ? (c === 'other' ? 0.12 : 0.3) : undefined, transitionDelay: drawn ? `${(i / mapDots.length) * 600}ms` : '0ms' }}
            />
          )
        })}
      </svg>
    </div>
  )
}
