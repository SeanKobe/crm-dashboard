import { useRef, useState } from 'react'

// Shared behaviour of the sign-in forms: errors appear after a field is left or after the first submit attempt, the first invalid field
// gets focus, and a second submit while one is running is ignored (so Enter or a double click can't send the request twice).
export function useAuthForm<K extends string>(errors: Record<K, string | null>, order: K[], refs: Record<K, React.RefObject<HTMLInputElement | null>>, values: Record<K, string>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const shown = (k: K): string | null => (touched[k] || submitted ? errors[k] : null)
  // Leaving a field only judges it when something was typed: tabbing through an empty field says nothing until the form is submitted.
  const blur = (k: K) => () => { if (values[k]) setTouched((t) => ({ ...t, [k]: true })) }
  /** Runs `work` when every field is valid; otherwise focuses the first invalid one. */
  const submit = async (work: () => Promise<void>) => {
    if (running.current) return
    setSubmitted(true)
    const bad = order.find((k) => errors[k])
    if (bad) { refs[bad].current?.focus(); return }
    running.current = true
    setBusy(true)
    try { await work() } finally { running.current = false; setBusy(false) }
  }
  return { shown, blur, submit, busy }
}
