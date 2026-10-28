import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CalendarDays, CircleUser, EllipsisVertical, Flag, GripVertical, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import { formatShort } from '../../lib/dates'
import type { MenuEntry, ProjectTask, TaskPatch, TaskPriority } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { DateField } from '../ui/DateField'
import { IconButton } from '../ui/IconButton'
import { Menu, Popover } from '../ui/Menu'
import { PRIORITIES, allOwners, isTaskOverdue, ownerById, priorityLabel } from './projectMeta'

// One task: grip handle, done checkbox, title (click to edit), priority, assignee, due date and a menu with Move up / Move down / Delete.
// Everything edits in place. Overdue is an icon plus the word "Overdue", never colour alone.
const priorityClass: Record<TaskPriority, string> = { high: 'bg-danger/12 text-danger-strong', medium: 'bg-warning/12 text-warning-foreground', low: 'bg-surface-muted text-text-secondary' }

function Title({ task, onRename }: { task: ProjectTask; onRename: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select() } }, [editing])
  const finish = (save: boolean) => {
    setEditing(false)
    const next = draft.trim()
    if (save && next && next !== task.title) onRename(next)
    else setDraft(task.title)
    requestAnimationFrame(() => button.current?.focus({ preventScroll: true }))
  }
  if (editing) {
    return (
      <input
        ref={input}
        aria-label={`Task title: ${task.title}`}
        value={draft}
        maxLength={140}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (editing) { setEditing(false); const next = draft.trim(); if (next && next !== task.title) onRename(next); else setDraft(task.title) } }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true) } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false) } }}
        className="h-8 w-full min-w-0 rounded-sm border border-primary bg-surface px-2 text-sm outline-none ring-[3px] ring-focus-ring"
      />
    )
  }
  return (
    <button ref={button} type="button" data-task-title onClick={() => { setDraft(task.title); setEditing(true) }} aria-label={`Edit title: ${task.title}`} className={cn('w-full min-w-0 truncate rounded-xs px-1 py-1 text-left text-sm outline-none transition-colors duration-hover ease-out hover:bg-surface-muted focus-ring motion-reduce:transition-none', task.done && 'text-text-secondary line-through')}>
      {task.title}
    </button>
  )
}

function DueControl({ task, onChange }: { task: ProjectTask; onChange: (dueDate: string) => void }) {
  const [open, setOpen] = useState(false)
  const [el, setEl] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo(() => ({ current: el }), [el])
  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) el?.focus({ preventScroll: true }) }, [el])
  const overdue = isTaskOverdue(task)
  const Icon = overdue ? TriangleAlert : CalendarDays
  return (
    <>
      <button
        ref={setEl}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-task-due={overdue ? 'overdue' : task.dueDate ? 'ok' : 'none'}
        aria-label={task.dueDate ? `Due ${formatShort(task.dueDate)}${overdue ? ', overdue' : ''}. Change due date` : 'Set due date'}
        onClick={() => setOpen((o) => !o)}
        className={cn('flex h-7 items-center gap-1 whitespace-nowrap rounded-sm px-1.5 text-compact outline-none transition-colors duration-hover ease-out hover:bg-surface-muted focus-ring motion-reduce:transition-none', overdue ? 'font-medium text-danger-strong' : 'text-text-secondary')}
      >
        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        {overdue ? `Overdue · ${formatShort(task.dueDate)}` : task.dueDate ? formatShort(task.dueDate) : 'No date'}
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} align="end" role="dialog" label="Due date">
        <div className="flex w-64 flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-hover">
          <DateField label="Due date" partial="ignore" value={task.dueDate} onChange={onChange} />
          <div className="flex justify-end"><Button state={task.dueDate ? 'default' : 'disabled'} onClick={() => { onChange(''); setOpen(false); el?.focus({ preventScroll: true }) }}>Clear date</Button></div>
        </div>
      </Popover>
    </>
  )
}

export interface TaskRowProps {
  task: ProjectTask
  index: number
  count: number
  /** Position among the visible tasks (for the Move up / Move down availability). */
  visibleIndex: number
  visibleCount: number
  selecting: boolean
  chosen: boolean
  onChoose: (chosen: boolean) => void
  dragEnabled: boolean
  /** A drag is over this row: draw the drop line above (moving up) or below (moving down). */
  dropLine: 'above' | 'below' | null
  onDone: (done: boolean) => void
  onPatch: (patch: TaskPatch) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}

export function TaskRow({ task, index, count, visibleIndex, visibleCount, selecting, chosen, onChoose, dragEnabled, dropLine, onDone, onPatch, onMove, onDelete }: TaskRowProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !dragEnabled })
  const { setNodeRef: setDropRef } = useDroppable({ id: task.id })
  const assignee = ownerById(task.assigneeId)
  const setRef = (el: HTMLLIElement | null) => { setDragRef(el); setDropRef(el) }
  const style: CSSProperties | undefined = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const menu: MenuEntry[] = [
    { id: 'up', label: 'Move up', disabled: visibleIndex === 0, onSelect: () => onMove(-1) },
    { id: 'down', label: 'Move down', disabled: visibleIndex === visibleCount - 1, onSelect: () => onMove(1) },
    { type: 'separator' },
    { id: 'delete', label: 'Delete task', danger: true, onSelect: onDelete },
  ]
  return (
    <li
      ref={setRef}
      style={style}
      data-task-id={task.id}
      data-task-done={task.done ? 'true' : 'false'}
      aria-label={`${task.title}${task.done ? ', done' : ''}${isTaskOverdue(task) ? ', overdue' : ''}. Task ${index + 1} of ${count}.`}
      className={cn(
        'relative flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-2 py-1.5 transition-[background-color,border-color,box-shadow,opacity] duration-hover ease-out motion-reduce:transition-none',
        isDragging ? 'z-20 border-primary bg-surface shadow-drag' : chosen ? 'border-primary/40 bg-primary-soft' : 'border-transparent hover:border-border hover:bg-surface-subtle',
        task.done && !isDragging && 'opacity-80',
        dropLine === 'above' && 'before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded-full before:bg-primary',
        dropLine === 'below' && 'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary',
      )}
    >
      {selecting ? (
        <Checkbox checked={chosen} onChange={onChoose} label={`Select task: ${task.title}`} />
      ) : (
        <button type="button" {...attributes} {...(dragEnabled ? listeners : {})} disabled={!dragEnabled} aria-label={`Reorder “${task.title}”: press Space to pick up, arrows to move`} data-task-handle className={cn('grid size-6 shrink-0 touch-none place-items-center rounded-xs text-text-muted outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', dragEnabled ? 'cursor-grab hover:text-text-primary active:cursor-grabbing' : 'cursor-not-allowed opacity-40')}>
          <GripVertical aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      )}
      <Checkbox checked={task.done} onChange={onDone} label={task.done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`} />
      <div className="min-w-40 flex-1"><Title task={task} onRename={(title) => onPatch({ title })} /></div>
      <Menu
        label={`Priority of ${task.title}`}
        items={PRIORITIES.map((p) => ({ id: p, label: priorityLabel[p], checked: task.priority === p, radio: true, onSelect: () => onPatch({ priority: p }) }))}
        trigger={({ props }) => (
          <button {...props} type="button" data-task-priority={task.priority} aria-label={`Priority: ${priorityLabel[task.priority]}. Change priority`} className={cn('flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-medium leading-3.75 outline-none transition-[filter] duration-hover ease-out hover:brightness-95 focus-ring motion-reduce:transition-none', priorityClass[task.priority])}>
            <Flag aria-hidden className="size-3.5" strokeWidth={1.75} />
            {priorityLabel[task.priority]}
          </button>
        )}
      />
      <Menu
        label={`Assignee of ${task.title}`}
        align="end"
        items={[{ id: 'none', label: 'Unassigned', icon: CircleUser, checked: task.assigneeId === '', radio: true, onSelect: () => onPatch({ assigneeId: '' }) }, ...allOwners.map((o) => ({ id: o.id, label: o.name, avatar: { initial: o.initial, tone: o.tone }, checked: task.assigneeId === o.id, radio: true, onSelect: () => onPatch({ assigneeId: o.id }) }))]}
        trigger={({ props }) => (
          <button {...props} type="button" data-task-assignee={task.assigneeId || 'none'} aria-label={assignee ? `Assignee: ${assignee.name}. Change assignee` : 'Unassigned. Assign someone'} className="grid size-7 place-items-center rounded-full outline-none transition-colors duration-hover ease-out hover:bg-surface-muted focus-ring motion-reduce:transition-none">
            {assignee ? <Avatar initial={assignee.initial} tone={assignee.tone} size="L" /> : <CircleUser aria-hidden className="size-5 text-text-muted" strokeWidth={1.75} />}
          </button>
        )}
      />
      <DueControl task={task} onChange={(dueDate) => onPatch({ dueDate })} />
      <Menu align="end" label={`Actions for ${task.title}`} items={menu} trigger={({ props }) => <span><IconButton {...{ icon: EllipsisVertical, label: `Actions for ${task.title}`, size: 'xs', menuProps: props }} /></span>} />
    </li>
  )
}
