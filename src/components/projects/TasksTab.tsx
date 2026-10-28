import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core'
import { CheckCheck, ListChecks, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../../context/toastContext'
import { projectsService } from '../../services/projects'
import type { Project, ProjectTask, TaskFilter, TaskPatch } from '../../types'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { TaskRow } from './TaskRow'
import { CURRENT_USER, isTaskOverdue, progressOf, progressText } from './projectMeta'

// The Tasks tab: quick add (Enter adds and the cursor stays), filters, inline editing, drag to reorder (with Move up / Move down in each
// task's menu as the keyboard alternative), and bulk complete or delete. Completing, deleting and bulk changes show a toast with Undo.
const FILTERS = ['All', 'Mine', 'Overdue', 'Completed'] as const
type FilterLabel = (typeof FILTERS)[number]
const toFilter = (l: FilterLabel): TaskFilter => l.toLowerCase() as TaskFilter
const toLabel = (f: TaskFilter): FilterLabel => (f.charAt(0).toUpperCase() + f.slice(1)) as FilterLabel

const EMPTY: Record<TaskFilter, { title: string; description: string }> = {
  all: { title: 'No tasks yet', description: 'Add the first task above and press Enter.' },
  mine: { title: 'Nothing assigned to you', description: 'Tasks assigned to you will show up here.' },
  overdue: { title: 'No overdue tasks', description: 'Everything with a due date is on time.' },
  completed: { title: 'No completed tasks yet', description: 'Tasks you tick off will show up here.' },
}

export function TasksTab({ project, onAnnounce }: { project: Project; onAnnounce: (msg: string) => void }) {
  const toast = useToast()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [chosen, setChosen] = useState<Set<string>>(() => new Set())
  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null)
  const quickAdd = useRef<HTMLInputElement>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor))

  const tasks = project.tasks
  const visible = useMemo(() => tasks.filter((t) => (filter === 'all' ? true : filter === 'mine' ? t.assigneeId === CURRENT_USER : filter === 'overdue' ? isTaskOverdue(t) : t.done)), [tasks, filter])
  const pr = progressOf(project)
  const chosenIds = useMemo(() => [...chosen].filter((id) => tasks.some((t) => t.id === id)), [chosen, tasks])
  const undoTo = (before: Project) => ({ label: 'Undo', onClick: () => { void projectsService.replace(before) } })
  const fail = (e: unknown) => toast({ type: 'error', title: 'That didn’t save', message: e instanceof Error ? e.message : undefined })

  const add = async (e?: FormEvent) => {
    e?.preventDefault()
    const text = title.trim()
    if (!text) { setError('Enter a task title.'); return }
    setError(null)
    setTitle('')
    try {
      await projectsService.addTask(project.id, { title: text })
      onAnnounce(`Added the task “${text}”.`)
    } catch (err) { fail(err) }
    quickAdd.current?.focus({ preventScroll: true })
  }

  const done = (t: ProjectTask, value: boolean) => {
    const before = project
    projectsService.setTaskDone(project.id, t.id, value).then(() => {
      const after = progressOf({ tasks: tasks.map((x) => (x.id === t.id ? { ...x, done: value } : x)) })
      onAnnounce(value ? `Completed “${t.title}”. ${progressText(after)} done.` : `Reopened “${t.title}”. ${progressText(after)} done.`)
      if (value) toast({ type: 'success', title: 'Task completed', message: t.title, action: undoTo(before) })
    }).catch(fail)
  }
  const patch = (t: ProjectTask, p: TaskPatch) => { projectsService.updateTask(project.id, t.id, p).then(() => { if (p.title) onAnnounce(`Renamed the task to “${p.title}”.`) }).catch(fail) }
  const remove = (ids: string[]) => {
    const before = project
    const names = tasks.filter((t) => ids.includes(t.id)).map((t) => t.title)
    projectsService.removeTasks(project.id, ids).then(() => {
      setChosen(new Set())
      toast({ type: 'info', title: ids.length === 1 ? 'Task deleted' : `${ids.length} tasks deleted`, message: names.length === 1 ? names[0] : undefined, action: undoTo(before) })
      onAnnounce(ids.length === 1 ? `Deleted “${names[0]}”.` : `Deleted ${ids.length} tasks.`)
    }).catch(fail)
  }
  const completeMany = (ids: string[]) => {
    const before = project
    const open = tasks.filter((t) => ids.includes(t.id) && !t.done).length
    projectsService.completeTasks(project.id, ids).then(() => {
      setChosen(new Set())
      toast({ type: 'success', title: open === 1 ? 'Task completed' : `${open} tasks completed`, action: undoTo(before) })
      onAnnounce(`Completed ${open} ${open === 1 ? 'task' : 'tasks'}.`)
    }).catch(fail)
  }
  // Move among the visible tasks: the task takes the place of its visible neighbour in the full list.
  const move = (t: ProjectTask, dir: -1 | 1) => {
    const at = visible.findIndex((x) => x.id === t.id)
    const neighbour = visible[at + dir]
    if (!neighbour) return
    const to = tasks.findIndex((x) => x.id === neighbour.id)
    projectsService.moveTask(project.id, t.id, to).then(() => onAnnounce(`Moved “${t.title}” ${dir < 0 ? 'up' : 'down'}. Position ${to + 1} of ${tasks.length}.`)).catch(fail)
  }

  const onDragStart = (e: DragStartEvent) => setDrag({ id: String(e.active.id), over: null })
  const onDragOver = (e: DragOverEvent) => setDrag((d) => (d ? { ...d, over: e.over ? String(e.over.id) : null } : d))
  const onDragEnd = (e: DragEndEvent) => {
    setDrag(null)
    const id = String(e.active.id)
    const over = e.over ? String(e.over.id) : null
    if (!over || over === id) return
    const to = tasks.findIndex((x) => x.id === over)
    const t = tasks.find((x) => x.id === id)
    if (to < 0 || !t) return
    projectsService.moveTask(project.id, id, to).then(() => onAnnounce(`Moved “${t.title}” to position ${to + 1} of ${tasks.length}.`)).catch(fail)
  }
  const nameOf = (id: string | number): string => tasks.find((t) => t.id === id)?.title ?? 'task'
  const dragIndex = drag ? tasks.findIndex((t) => t.id === drag.id) : -1
  const overIndex = drag?.over ? tasks.findIndex((t) => t.id === drag.over) : -1

  return (
    <div className="flex flex-col gap-4" data-tasks-tab>
      <form onSubmit={(e) => { void add(e) }} className="flex flex-col gap-1.5" noValidate>
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <input
              ref={quickAdd}
              data-quick-add
              aria-label="Add a task"
              aria-invalid={error ? true : undefined}
              aria-describedby="quick-add-help"
              value={title}
              maxLength={140}
              onChange={(e) => { setTitle(e.target.value); setError(null) }}
              placeholder="Add a task and press Enter"
              className={`h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none transition-[border-color,box-shadow] duration-hover ease-out placeholder:text-text-secondary hover:border-border-strong focus:border-primary focus:ring-[3px] focus:ring-focus-ring motion-reduce:transition-none ${error ? 'border-danger' : 'border-border'}`}
            />
            <p id="quick-add-help" className={`text-xs leading-3.75 ${error ? 'text-danger-strong' : 'text-text-secondary'}`} role={error ? 'alert' : undefined}>{error ?? 'Press Enter to add. The cursor stays here so you can keep typing.'}</p>
          </div>
          <Button icon={Plus} onClick={() => { void add() }}>Add task</Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedFilter label="Task filter" tone="strong" options={FILTERS} value={toLabel(filter)} onChange={(l) => setFilter(toFilter(l))} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary tabular-nums" data-task-count>{progressText(pr)} done</span>
          <Button icon={ListChecks} onClick={() => { setSelecting((s) => !s); setChosen(new Set()) }}>{selecting ? 'Done selecting' : 'Select'}</Button>
        </div>
      </div>

      {selecting && (
        <div role="toolbar" aria-label="Bulk actions" data-bulk-bar className="flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2">
          <span className="mr-auto text-sm font-medium" aria-live="polite">{chosenIds.length} selected</span>
          <Button onClick={() => setChosen(new Set(visible.map((t) => t.id)))}>Select all</Button>
          <Button icon={CheckCheck} state={chosenIds.length ? 'default' : 'disabled'} onClick={() => completeMany(chosenIds)}>Complete</Button>
          <Button icon={Trash2} variant="destructive" strong state={chosenIds.length ? 'default' : 'disabled'} onClick={() => remove(chosenIds)}>Delete</Button>
          <Button icon={X} onClick={() => { setSelecting(false); setChosen(new Set()) }}>Cancel</Button>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={ListChecks} title={EMPTY[filter].title} description={EMPTY[filter].description} compact className="rounded-lg border border-dashed border-border" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDrag(null)}
          accessibility={{
            screenReaderInstructions: { draggable: 'To reorder this task, press Space to pick it up, use the arrow keys to move it, and press Space to drop it. Press Escape to cancel. You can also use Move up and Move down in the task’s menu.' },
            announcements: {
              onDragStart: ({ active }) => `Picked up “${nameOf(active.id)}”.`,
              onDragOver: ({ active, over }) => (over ? `“${nameOf(active.id)}” is over position ${tasks.findIndex((t) => t.id === over.id) + 1} of ${tasks.length}.` : undefined),
              onDragEnd: ({ active, over }) => (over ? `Dropped “${nameOf(active.id)}” at position ${tasks.findIndex((t) => t.id === over.id) + 1} of ${tasks.length}.` : `Dropped “${nameOf(active.id)}”.`),
              onDragCancel: ({ active }) => `Cancelled. “${nameOf(active.id)}” stays where it was.`,
            },
          }}
        >
          <ul className="flex flex-col gap-1" aria-label="Tasks" data-task-list>
            {visible.map((t, i) => (
              <TaskRow
                key={t.id}
                task={t}
                index={tasks.findIndex((x) => x.id === t.id)}
                count={tasks.length}
                visibleIndex={i}
                visibleCount={visible.length}
                selecting={selecting}
                chosen={chosen.has(t.id)}
                onChoose={(c) => setChosen((s) => { const next = new Set(s); if (c) next.add(t.id); else next.delete(t.id); return next })}
                dragEnabled={filter === 'all' && !selecting}
                dropLine={drag && drag.over === t.id && drag.id !== t.id ? (dragIndex > overIndex ? 'above' : 'below') : null}
                onDone={(v) => done(t, v)}
                onPatch={(p) => patch(t, p)}
                onMove={(dir) => move(t, dir)}
                onDelete={() => remove([t.id])}
              />
            ))}
          </ul>
        </DndContext>
      )}
    </div>
  )
}
