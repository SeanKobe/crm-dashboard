import { useEffect, useState, type ReactNode } from 'react'
import { motion, prefersReducedMotion } from '../lib/motion'
import { LoadedContext } from './loadedContext'

export function LoadedProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(prefersReducedMotion())
  useEffect(() => {
    const id = setTimeout(() => setLoaded(true), motion.skeleton)
    return () => clearTimeout(id)
  }, [])
  return <LoadedContext.Provider value={loaded}>{children}</LoadedContext.Provider>
}
