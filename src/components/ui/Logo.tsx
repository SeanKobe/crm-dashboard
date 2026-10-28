import { cn } from '../../lib/cn'

// Logo lockup from the Figma "Logo" component: C ring (primary) with the orange dot at the opening, title and subtitle.
// The mark path is the SVG exported from Figma; fills use theme tokens instead of hex values. `collapsed` fades the text out.
export interface LogoProps {
  title?: string
  subtitle?: string
  /** Fades the text out, leaving the mark. */
  collapsed?: boolean
}

export function Logo({ title = 'CRM', subtitle = 'Lead Management', collapsed = false }: LogoProps) {
  return (
    <div className="flex items-center">
      <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="shrink-0">
        <path
          d="M27.3137 27.3137C25.0761 29.5514 22.2251 31.0752 19.1214 31.6926C16.0177 32.3099 12.8007 31.9931 9.87707 30.7821C6.95345 29.5711 4.45459 27.5203 2.69649 24.8891C0.938384 22.2579 1.94898e-07 19.1645 0 16C-1.94898e-07 12.8355 0.938383 9.74207 2.69649 7.11089C4.45459 4.4797 6.95345 2.42894 9.87706 1.21794C12.8007 0.00693335 16.0177 -0.30992 19.1214 0.307443C22.2251 0.924806 25.0761 2.44866 27.3137 4.6863L23.6933 8.30668C22.1717 6.78509 20.2331 5.74887 18.1226 5.32906C16.0121 4.90926 13.8245 5.12472 11.8364 5.9482C9.84834 6.77168 8.14912 8.1662 6.95361 9.9554C5.7581 11.7446 5.12 13.8481 5.12 16C5.12 18.1519 5.7581 20.2554 6.95361 22.0446C8.14912 23.8338 9.84834 25.2283 11.8364 26.0518C13.8245 26.8753 16.0121 27.0908 18.1226 26.671C20.2331 26.2511 22.1717 25.2149 23.6933 23.6933L27.3137 27.3137Z"
          fill="var(--color-primary)"
        />
        <circle cx="29" cy="16" r="4" fill="var(--color-accent-orange)" />
      </svg>
      <div className={cn('flex flex-col gap-0.5 overflow-hidden whitespace-nowrap transition-[opacity,max-width,margin] duration-move ease-out motion-reduce:transition-none', collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-40 opacity-100')}>
        <span className="text-sm font-medium leading-tight">{title}</span>
        <span className="text-xs leading-tight text-muted-strong">{subtitle}</span>
      </div>
    </div>
  )
}
