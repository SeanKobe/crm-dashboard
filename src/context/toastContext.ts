import { createContext, useContext } from 'react'
import type { ToastFn } from '../types'

export const ToastContext = createContext<ToastFn>(() => 0)
// const toast = useToast(); toast({ type: 'success' | 'error' | 'info' | 'warning', title, message })
export const useToast = () => useContext(ToastContext)
