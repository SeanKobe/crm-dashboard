import { useEffect } from 'react'
import { useToast } from '../../context/toastContext'
import { subscribeDataFailures } from '../../services/remote/errors'

// A save that fails in the background (the database refused it, or the network dropped) always ends in a clear toast, even where a page
// doesn't handle the error itself. Put once inside the toast provider.
export function DataFailureToasts() {
  const toast = useToast()
  useEffect(() => subscribeDataFailures((f) => toast({ type: 'error', title: f.title, message: f.message, duration: 6000 })), [toast])
  return null
}
