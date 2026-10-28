import { cn } from '../../lib/cn'
import type { AvatarSize, Tone } from '../../types'

// Soft tinted circle with an initial, like the Figma Avatar (tone x size). Tints use theme colors only.
const tones: Record<Tone, { tint: string; text: string }> = {
  purple: { tint: 'bg-primary', text: 'text-primary' },
  green: { tint: 'bg-success', text: 'text-success' },
  orange: { tint: 'bg-accent-orange', text: 'text-accent-orange' },
  red: { tint: 'bg-danger', text: 'text-danger' },
  amber: { tint: 'bg-warning', text: 'text-warning-foreground' },
}
const sizes: Record<AvatarSize, string> = { S: 'size-5 text-2xs', M: 'size-6 text-2xs', L: 'size-7 text-xs', LG: 'size-8 text-xs', XL: 'size-10 text-compact' }

export interface AvatarProps {
  initial: string
  tone?: Tone
  size?: AvatarSize
  className?: string
}

export function Avatar({ initial, tone = 'purple', size = 'L', className }: AvatarProps) {
  const t = tones[tone]
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface font-medium transition-[width,height] duration-move ease-out motion-reduce:transition-none', sizes[size], className)} aria-hidden>
      <span className={cn('absolute inset-0 rounded-full opacity-16', t.tint)} />
      <span className={cn('relative leading-none', t.text)}>{initial}</span>
    </span>
  )
}
