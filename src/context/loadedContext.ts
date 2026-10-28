import { createContext, useContext } from 'react'

// `loaded` becomes true after the skeleton period; counters and charts wait for it before animating.
export const LoadedContext = createContext(true)
export const useLoaded = () => useContext(LoadedContext)
