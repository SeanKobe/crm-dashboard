// Helpers for note bodies (HTML from the editor): plain text for previews and search, and the new-note templates.
export function htmlToText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html.replace(/<\/(p|li|h[1-6]|ul|ol|div|blockquote)>/gi, '$& '), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

export function preview(html: string, max = 160): string {
  const t = htmlToText(html)
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

export const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const list = (items: string[]): string => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`
const tasks = (items: string[]): string => `<ul data-type="taskList">${items.map((i) => `<li data-checked="false" data-type="taskItem"><p>${i}</p></li>`).join('')}</ul>`

export type TemplateId = 'blank' | 'call' | 'meeting' | 'followup'
export interface NoteTemplate {
  id: TemplateId
  label: string
  title: string
  tags: string[]
  body: string
}

export const noteTemplates: NoteTemplate[] = [
  { id: 'blank', label: 'Blank', title: '', tags: [], body: '' },
  {
    id: 'call', label: 'Call notes', title: 'Call notes', tags: ['call'],
    body: `<h2>Who</h2><p>Name, role, company</p><h2>Goal</h2><p>What we wanted from this call</p><h2>Discussion</h2>${list(['Key points', 'Objections'])}<h2>Next steps</h2>${tasks(['Follow up by email'])}`,
  },
  {
    id: 'meeting', label: 'Meeting notes', title: 'Meeting notes', tags: ['meeting'],
    body: `<h2>Attendees</h2>${list(['Name'])}<h2>Agenda</h2>${list(['Topic'])}<h2>Decisions</h2>${list(['Decision'])}<h2>Action items</h2>${tasks(['Owner: action, due date'])}`,
  },
  {
    id: 'followup', label: 'Follow-up', title: 'Follow-up', tags: ['follow-up'],
    body: `<h2>Context</h2><p>Where we left off</p><h2>What to send</h2>${tasks(['Recap email', 'Proposal or pricing'])}<h2>When</h2><p>Date and channel</p>`,
  },
]
