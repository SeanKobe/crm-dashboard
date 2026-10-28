import { DEMO_TODAY, addDays } from '../lib/dates'
import type { Project, ProjectActivity, ProjectLink, ProjectStatus, ProjectTask, TaskPriority } from '../types'
import { companyId, contactId } from './records'

// Seed projects. Dates are offsets from the demo "today" so overdue and upcoming work always looks right.
const day = (offset: number): string => addDays(DEMO_TODAY, offset)
const at = (offset: number, time = '10:00'): string => `${day(offset)}T${time}:00`

// [title, done, assignee, due offset (days from today, null = none), priority]
type T = [string, boolean, string, number | null, TaskPriority]

function tasks(pid: string, rows: T[]): ProjectTask[] {
  return rows.map(([title, done, assigneeId, due, priority], i) => ({
    id: `${pid}-t${i + 1}`,
    title,
    done,
    assigneeId,
    dueDate: due === null ? '' : day(due),
    priority,
    completedAt: done ? at(Math.min(-1, (due ?? -3) - 1 - (i % 3))) : null,
    createdAt: at(-30 + i),
  }))
}

function activityFor(pid: string, name: string, ownerId: string, list: ProjectTask[], createdOffset: number, extra: ProjectActivity[] = []): ProjectActivity[] {
  const done = list.filter((t) => t.done && t.completedAt)
  const entries: ProjectActivity[] = [
    { id: `${pid}-a0`, kind: 'created', text: `Created the project “${name}”`, at: at(createdOffset, '09:00'), ownerId },
    ...done.map((t, i) => ({ id: `${pid}-a${i + 1}`, kind: 'task-done' as const, text: `Completed “${t.title}”`, at: t.completedAt ?? at(-1), ownerId: t.assigneeId || ownerId })),
    ...extra,
  ]
  return entries.sort((a, b) => b.at.localeCompare(a.at))
}

interface Seed {
  id: string
  name: string
  description: string
  status: ProjectStatus
  ownerId: string
  memberIds: string[]
  dueOffset: number | null
  links: ProjectLink[]
  rows: T[]
  createdOffset: number
  updatedOffset: number
  archived?: boolean
  extra?: ProjectActivity[]
}

const seeds: Seed[] = [
  {
    id: 'p-q4', name: 'Q4 Pipeline', status: 'Active', ownerId: 'o1', memberIds: ['o2', 'o3'], dueOffset: 25, createdOffset: -34, updatedOffset: -1,
    description: 'Get every qualified deal to a signed proposal before the quarter closes. Weekly review on Mondays.',
    links: [{ type: 'deal', id: 'd-109' }, { type: 'deal', id: 'd-111' }],
    rows: [
      ['Review the Q4 pipeline with the team', true, 'o1', -20, 'high'], ['Clean up stale deals', true, 'o2', -16, 'medium'], ['Refresh pricing sheet', true, 'o1', -12, 'medium'],
      ['Send proposal to Globex', true, 'o1', -8, 'high'], ['Schedule legal review for Pinecrest', true, 'o3', -5, 'medium'], ['Update forecast in the board deck', true, 'o2', -3, 'low'],
      ['Follow up with Vertex Mobility', true, 'o3', -1, 'high'], ['Prepare Initech pilot terms', false, 'o2', 2, 'high'], ['Draft discount approval rules', false, 'o1', 6, 'medium'],
      ['Book customer references for proposals', false, 'o3', 9, 'low'], ['Mid-quarter forecast review', false, 'o1', 14, 'medium'], ['Close-out report for Q4', false, '', 24, 'low'],
    ],
  },
  {
    id: 'p-web', name: 'Website Relaunch', status: 'Active', ownerId: 'o2', memberIds: ['o4'], dueOffset: 46, createdOffset: -41, updatedOffset: -3,
    description: 'New marketing site with case studies, a pricing page and a demo request form that feeds the CRM.',
    links: [{ type: 'contact', id: contactId('Mina Park') }],
    rows: [
      ['Collect brand assets', true, 'o2', -25, 'medium'], ['Write the new homepage copy', true, 'o2', -14, 'high'], ['Design the pricing page', true, 'o4', -7, 'high'], ['Build the demo request form', false, 'o4', -2, 'high'],
      ['Connect the form to the CRM', false, 'o2', 5, 'high'], ['Record customer quotes', false, '', 12, 'medium'], ['Accessibility check', false, 'o4', 28, 'medium'], ['Redirect the old URLs', false, 'o2', 40, 'low'], ['Launch announcement', false, 'o2', 46, 'medium'],
    ],
  },
  {
    id: 'p-onboard', name: 'Partner Onboarding', status: 'Planned', ownerId: 'o3', memberIds: ['o1'], dueOffset: 39, createdOffset: -12, updatedOffset: -6,
    description: 'Welcome the new logistics partners: accounts, training sessions and a shared playbook.',
    links: [{ type: 'deal', id: 'd-106' }, { type: 'contact', id: contactId('Mina Park') }],
    rows: [
      ['Confirm the partner list', false, 'o3', 3, 'high'], ['Create partner accounts', false, 'o3', 8, 'medium'], ['Prepare the onboarding deck', false, 'o1', 12, 'medium'], ['Schedule the kickoff call', false, 'o3', 15, 'high'],
      ['Share the partner playbook', false, '', 22, 'low'], ['Collect first-month feedback', false, 'o1', 39, 'low'],
    ],
  },
  {
    id: 'p-legacy', name: 'Legacy CRM Migration', status: 'Completed', ownerId: 'o4', memberIds: ['o1', 'o2'], dueOffset: -20, createdOffset: -150, updatedOffset: -112, archived: true,
    description: 'Move accounts, contacts and notes from the old CRM. Finished and archived.',
    links: [{ type: 'company', id: companyId('Acme Corp') }],
    rows: [
      ['Export data from the old CRM', true, 'o4', -140, 'high'], ['Map fields', true, 'o4', -130, 'medium'], ['Clean duplicate contacts', true, 'o2', -120, 'medium'], ['Import accounts', true, 'o4', -110, 'high'],
      ['Import contacts and notes', true, 'o1', -100, 'high'], ['Check a sample of records', true, 'o2', -90, 'medium'], ['Train the team', true, 'o1', -75, 'medium'], ['Switch off the old system', true, 'o4', -60, 'low'], ['Archive the export files', true, 'o4', -45, 'low'],
    ],
  },
  {
    id: 'p-acme', name: 'Acme Renewal Rollout', status: 'Active', ownerId: 'o1', memberIds: ['o2'], dueOffset: 11, createdOffset: -18, updatedOffset: 0,
    description: 'Everything needed to renew Acme Corp for another year: terms, security review and the signed order form.',
    links: [{ type: 'deal', id: 'd-105' }, { type: 'contact', id: contactId('Avery Brooks') }],
    rows: [
      ['Kick off with Avery Brooks', true, 'o1', -14, 'high'], ['Gather usage numbers for the year', true, 'o2', -9, 'medium'], ['Send the renewal quote', true, 'o1', -4, 'high'], ['Answer the security questionnaire', false, 'o2', -2, 'high'],
      ['Negotiate multi-year terms', false, 'o1', 3, 'high'], ['Legal review of the order form', false, 'o2', 6, 'medium'], ['Collect the signature', false, 'o1', 9, 'high'], ['Hand over to customer success', false, '', 11, 'low'],
    ],
  },
  {
    id: 'p-atlas', name: 'Atlas Freight Implementation', status: 'On hold', ownerId: 'o2', memberIds: ['o1', 'o4'], dueOffset: 60, createdOffset: -27, updatedOffset: -9,
    description: 'Roll out the dispatch module for Atlas Freight. Paused until their legal team signs off on the contract.',
    links: [{ type: 'deal', id: 'd-114' }, { type: 'contact', id: contactId('Grace Okafor') }],
    rows: [
      ['Discovery workshop', true, 'o2', -20, 'high'], ['Document the dispatch workflow', true, 'o2', -12, 'medium'], ['Wait for contract signature', false, 'o1', 2, 'high'], ['Configure roles and permissions', false, 'o4', 14, 'medium'],
      ['Import the depot list', false, 'o4', 18, 'medium'], ['Pilot with the first depot', false, 'o2', 30, 'high'], ['Driver training', false, '', 40, 'medium'], ['Review the pilot', false, 'o1', 48, 'low'], ['Roll out to all depots', false, 'o2', 56, 'high'], ['Close the project', false, 'o2', 60, 'low'],
    ],
  },
  {
    id: 'p-brightside', name: 'Brightside Schools Pilot Setup', status: 'Planned', ownerId: 'o4', memberIds: [], dueOffset: 88, createdOffset: -5, updatedOffset: -2,
    description: 'Set up the 90-day pilot for Brightside Schools once the license is approved.',
    links: [{ type: 'deal', id: 'd-115' }, { type: 'contact', id: contactId('Tom Hargrove') }],
    rows: [
      ['Confirm pilot scope with Tom Hargrove', false, 'o4', 7, 'high'], ['Create the school accounts', false, 'o4', 20, 'medium'], ['Teacher training session', false, '', 35, 'medium'], ['Mid-pilot check-in', false, 'o4', 60, 'low'], ['Pilot results summary', false, 'o4', 88, 'medium'],
    ],
  },
  {
    id: 'p-foxglove', name: 'Foxglove Pharma Training Rollout', status: 'Completed', ownerId: 'o1', memberIds: ['o3'], dueOffset: -3, createdOffset: -45, updatedOffset: -2,
    description: 'Train 120 seats in two waves after the deal closed. Everything is done; keeping it for the record.',
    links: [{ type: 'deal', id: 'd-119' }, { type: 'contact', id: contactId('Leo Marchetti') }],
    rows: [
      ['Kickoff call', true, 'o1', -36, 'high'], ['Create the 120 accounts', true, 'o3', -32, 'high'], ['Prepare training material', true, 'o1', -28, 'medium'], ['Wave 1 training: 60 seats', true, 'o1', -22, 'high'],
      ['Collect wave 1 feedback', true, 'o3', -19, 'medium'], ['Adjust material', true, 'o1', -16, 'low'], ['Wave 2 training: 60 seats', true, 'o3', -12, 'high'], ['Collect wave 2 feedback', true, 'o3', -10, 'medium'],
      ['Set up admin reports', true, 'o1', -9, 'medium'], ['Write the handover notes', true, 'o1', -7, 'low'], ['Customer success handover', true, 'o3', -6, 'medium'], ['Send the satisfaction survey', true, 'o1', -5, 'low'],
      ['Review survey results', true, 'o1', -4, 'low'], ['Close out the project', true, 'o1', -3, 'low'],
    ],
  },
]

function build(s: Seed): Project {
  const list = tasks(s.id, s.rows)
  const extra: ProjectActivity[] = []
  if (s.status === 'On hold') extra.push({ id: `${s.id}-st`, kind: 'status', text: 'Status changed from Active to On hold', at: at(s.updatedOffset, '14:00'), ownerId: s.ownerId })
  if (s.status === 'Completed') extra.push({ id: `${s.id}-st`, kind: 'status', text: 'Status changed from Active to Completed', at: at(s.updatedOffset, '15:30'), ownerId: s.ownerId })
  if (s.archived) extra.push({ id: `${s.id}-ar`, kind: 'archived', text: 'Archived the project', at: at(s.updatedOffset, '16:00'), ownerId: s.ownerId })
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    status: s.status,
    ownerId: s.ownerId,
    memberIds: s.memberIds,
    dueDate: s.dueOffset === null ? '' : day(s.dueOffset),
    links: s.links,
    tasks: list,
    activity: activityFor(s.id, s.name, s.ownerId, list, s.createdOffset, extra),
    archivedAt: s.archived ? at(s.updatedOffset, '16:00') : null,
    deletedAt: null,
    createdAt: at(s.createdOffset, '09:00'),
    updatedAt: at(s.updatedOffset, '12:00'),
  }
}

export const seedProjects = (): Project[] => seeds.map(build)
