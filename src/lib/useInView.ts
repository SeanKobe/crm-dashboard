import { useEffect, useRef, useState } from 'react'

// True once the element has scrolled into view (and stays true: animations play once per element).
export function useInView<E extends HTMLElement = HTMLDivElement>({ threshold = 0.3, enabled = true }: { threshold?: number; enabled?: boolean } = {}) {
  const ref = useRef<E | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!enabled || inView) return undefined
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      const id = requestAnimationFrame(() => setInView(true))
      return () => cancelAnimationFrame(id)
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, inView, threshold])
  return { ref, inView }
}
