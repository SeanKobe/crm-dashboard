import { cn } from '../../lib/cn'
import type { SpinnerSize, SpinnerTone } from '../../types'

// Figma "Spinner": a faint ring with a primary arc (tones Primary / Neutral / Inverse, sizes S 16 / M 24 / L 40).
const sizes: Record<SpinnerSize, string> = { S: 'size-4', M: 'size-6', L: 'size-10' }
const tones: Record<SpinnerTone, [track: string, arc: string]> = { primary: ['text-border', 'text-primary'], neutral: ['text-border', 'text-text-secondary'], inverse: ['text-primary-foreground/30', 'text-primary-foreground'] }
export interface SpinnerProps {
  size?: SpinnerSize
  tone?: SpinnerTone
  className?: string
}

export function Spinner({ size = 'S', tone = 'primary', className }: SpinnerProps) {
  const [track, arc] = tones[tone]
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn('animate-spin motion-reduce:animate-none', sizes[size], className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className={track} />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={arc} />
    </svg>
  )
}
