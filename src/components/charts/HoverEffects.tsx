import { cn } from '../../lib/cn'

// Gradient fill that fades in over a bar (primary -> primary-soft). Place inside a `relative` bar.
export function HoverFill({ active, direction = 'down', className }: { active: boolean; direction?: 'down' | 'right'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 from-primary to-primary-soft opacity-0 transition-opacity duration-chart-hover ease-out',
        direction === 'down' ? 'bg-linear-to-b' : 'bg-linear-to-r',
        active && 'opacity-100',
        className,
      )}
    />
  )
}

// Dark dot plus a dashed guide that "draws" from the dot. Place inside a `relative` bar.
// vertical: dot on top, line runs down to the baseline. horizontal: dot on the right end,
// line runs left to the axis.
export function HoverGuide({ active, orientation = 'vertical' }: { active: boolean; orientation?: 'vertical' | 'horizontal' }) {
  const vertical = orientation === 'vertical'
  // Reveal the dashed line from the dot outward by animating an inset clip.
  const closed = vertical ? 'inset(0 0 100% 0)' : 'inset(0 0 0 100%)'
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span
        className={cn(
          'absolute border-text-primary transition-[clip-path] duration-chart-hover ease-out',
          vertical
            ? 'left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed'
            : 'right-0 top-1/2 w-full -translate-y-1/2 border-t-2 border-dashed',
        )}
        style={{ clipPath: active ? 'inset(0)' : closed }}
      />
      <span
        className={cn(
          'absolute size-2 scale-0 rounded-full bg-text-primary transition-transform duration-chart-hover ease-out',
          vertical ? 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
          active && 'scale-100',
        )}
      />
    </span>
  )
}
