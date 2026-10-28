// Ids for records that notes and deals can link to. Contacts and companies have no id of their own in the deal data, so the id is a slug of the name.
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const contactId = (name: string): string => `ct-${slug(name)}`
export const companyId = (name: string): string => `co-${slug(name)}`

export const recordLabel: Record<'deal' | 'contact' | 'company' | 'note' | 'project', string> = { deal: 'Deal', contact: 'Contact', company: 'Company', note: 'Note', project: 'Project' }
