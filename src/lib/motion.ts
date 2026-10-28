import tokens from '../../design/figma-tokens.json'

// Shared motion tokens (milliseconds) read from the same file that generates the CSS variables in theme.css.
const ms = (v: string): number => parseInt(v, 10)
export const motion = {
  hover: ms(tokens.motion.hover),
  move: ms(tokens.motion.move),
  chart: ms(tokens.motion.chart),
  chartHover: ms(tokens.motion['chart-hover']),
  count: ms(tokens.motion.count),
  skeleton: ms(tokens.motion.skeleton),
  storageStep: ms(tokens.motion['storage-step']),
  storageHold: ms(tokens.motion['storage-hold']),
  ease: tokens.motion.ease,
}
export const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
