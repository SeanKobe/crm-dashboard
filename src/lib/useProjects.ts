import { useEffect, useRef, useState } from 'react'
import { configureProjectsService, projectsService, subscribeProjects } from '../services/projects'
import type { Project } from '../types'

// Data hooks for Projects. They only talk to the service. useProjects() loads every project that is not deleted (archived ones included;
// callers filter) and stays in step with every write; useProject(id) loads one (deleted ones too, so the page can offer Restore).
export type ProjectsStatus = 'loading' | 'ready' | 'error'

export interface UseProjects {
  projects: Project[]
  status: ProjectsStatus
  error: string | null
  reload: () => void
}

let firstLoadDone = false
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function useProjects({ minLoadMs = 0, simulateError }: { minLoadMs?: number; simulateError?: boolean } = {}): UseProjects {
  const [projects, setProjects] = useState<Project[]>([])
  const [status, setStatus] = useState<ProjectsStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    if (simulateError !== undefined) configureProjectsService({ failReads: simulateError })
    const wait = !firstLoadDone && minLoadMs ? sleep(minLoadMs) : Promise.resolve()
    Promise.all([projectsService.list(), wait])
      .then(([rows]) => { if (!live) return; if (minLoadMs) firstLoadDone = true; setProjects(rows); setError(null); setStatus('ready') })
      .catch((e: unknown) => { if (!live) return; setError(e instanceof Error ? e.message : 'Could not load projects.'); setStatus('error') })
    return () => { live = false }
  }, [minLoadMs, simulateError, tick])

  // Writes arrive as events: apply them straight away (no refetch).
  useEffect(() => subscribeProjects((e) => {
    setProjects((list) => {
      let next = list
      for (const p of e.projects) {
        if (p.deletedAt !== null) next = next.filter((x) => x.id !== p.id)
        else if (next.some((x) => x.id === p.id)) next = next.map((x) => (x.id === p.id ? p : x))
        else next = [p, ...next]
      }
      return next
    })
  }), [])
  return { projects, status, error, reload: () => { setStatus('loading'); setTick((t) => t + 1) } }
}

export function useProject(id: string | null, { simulateError, tick = 0 }: { simulateError?: boolean; tick?: number } = {}): { project: Project | null | undefined; error: boolean } {
  const [state, setState] = useState<{ id: string | null; project: Project | null | undefined; error: boolean }>({ id, project: undefined, error: false })
  const idRef = useRef(id)
  useEffect(() => { idRef.current = id })
  useEffect(() => {
    if (!id) return undefined
    let live = true
    if (simulateError !== undefined) configureProjectsService({ failReads: simulateError })
    projectsService.get(id).then((p) => { if (live) setState({ id, project: p, error: false }) }).catch(() => { if (live) setState({ id, project: null, error: true }) })
    return () => { live = false }
  }, [id, simulateError, tick])
  useEffect(() => subscribeProjects((e) => {
    const hit = e.projects.find((p) => p.id === idRef.current)
    if (hit) setState({ id: hit.id, project: hit, error: false })
  }), [])
  return { project: state.id === id ? state.project : undefined, error: state.id === id && state.error }
}
