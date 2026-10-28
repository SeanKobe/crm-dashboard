import { EllipsisVertical, Download, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../context/toastContext'
import { useWidgets } from '../../context/widgetsContext'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import { Modal } from '../ui/Modal'
import type { MenuEntry, WidgetId } from '../../types'

// The card "more" menu: Export, Refresh, Remove widget (Remove asks first, in the Figma destructive Modal).
export interface WidgetMenuProps {
  id: WidgetId
  title: string
  /** Extra entries placed above Export. */
  extra?: MenuEntry[]
}

export function WidgetMenu({ id, title, extra = [] }: WidgetMenuProps) {
  const toast = useToast()
  const { hide, refresh } = useWidgets()
  const [confirm, setConfirm] = useState(false)
  const items: MenuEntry[] = [
    ...extra,
    { id: 'export', label: 'Export', icon: Download, onSelect: () => toast({ type: 'success', title: `${title} exported`, message: `${title.toLowerCase().replace(/\s+/g, '-')}.csv is ready.` }) },
    { id: 'refresh', label: 'Refresh', icon: RefreshCw, onSelect: () => { refresh(id); toast({ type: 'info', title: `${title} refreshed` }) } },
    { type: 'separator' },
    { id: 'remove', label: 'Remove widget', icon: Trash2, danger: true, onSelect: () => setConfirm(true) },
  ]
  return (
    <>
      <Menu align="end" label={`${title} options`} items={items} trigger={({ props }) => <IconButton icon={EllipsisVertical} label={`${title} options`} size="sm" menuProps={props} />} />
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Remove ${title}?`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirm(false); hide(id) }}>Remove</Button>
          </>
        }
      >
        The widget leaves the dashboard. You can bring it back any time from Customize Widget.
      </Modal>
    </>
  )
}
