import { useRef, useState } from 'react'
import { Puzzle } from 'lucide-react'
import { widgets } from '../../data/mock'
import { useToast } from '../../context/toastContext'
import { useWidgets } from '../../context/widgetsContext'
import type { WidgetId } from '../../types'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Menu'
import { Toggle } from '../ui/Toggle'

// "Customize Widget" panel: a Toggle per card. Hiding animates the card out and the grid reflows (see WidgetGrid).
export function CustomizePanel() {
  const [open, setOpen] = useState(false)
  const { hidden, toggle, show, reset } = useWidgets()
  const toast = useToast()
  // Hiding a card offers Undo (Figma "Toast Action"); showing one needs no toast.
  const hideOrShow = (id: WidgetId, label: string) => {
    if (!hidden.includes(id)) toast({ type: 'success', title: 'Widget hidden', message: `${label} was removed from the dashboard.`, action: { label: 'Undo', onClick: () => show(id) } })
    toggle(id)
  }
  const ref = useRef<HTMLDivElement>(null)
  const close = (restore: boolean = true) => { setOpen(false); if (restore) ref.current?.querySelector('button')?.focus({ preventScroll: true }) }
  return (
    <>
      <Button icon={Puzzle} menuProps={{ ref, 'aria-haspopup': 'dialog', 'aria-expanded': open, onClick: () => setOpen((o) => !o) }}>Customize Widget</Button>
      <Popover open={open} onClose={close} anchorRef={ref} align="end" role="dialog" label="Customize widgets">
        <div className="flex w-72 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-hover">
          <div>
            <h2 className="text-sm font-medium leading-4.25">Customize widgets</h2>
            <p className="whitespace-nowrap text-xs leading-3.75 text-text-muted">Choose which cards appear on the dashboard.</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {widgets.map((w) => <Toggle key={w.id} label={w.label} checked={!hidden.includes(w.id)} onChange={() => hideOrShow(w.id, w.label)} />)}
          </div>
          <div className="flex justify-end gap-2">
            <Button state={hidden.length ? 'default' : 'disabled'} onClick={reset}>Reset to default</Button>
            <Button variant="primary" onClick={() => close(true)}>Done</Button>
          </div>
        </div>
      </Popover>
    </>
  )
}
