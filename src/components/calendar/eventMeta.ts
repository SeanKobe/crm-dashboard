import { BellRing, Handshake, Hash, MapPin, Phone, Repeat2, SquareCheckBig, Users, Video } from 'lucide-react'
import type { EventPlatform, EventType, IconComponent } from '../../types'

// One icon AND one color per event type, so the type never depends on color alone.
export const EVENT_TYPES: EventType[] = ['Meeting', 'Call', 'Task', 'Follow-up']
export const PLATFORMS: EventPlatform[] = ['Google Meet', 'Zoom', 'Slack', 'In person', 'Phone']

export const typeMeta: Record<EventType, { icon: IconComponent; chip: string; bar: string; dot: string; text: string }> = {
  Meeting: { icon: Users, chip: 'bg-primary/12', bar: 'border-l-primary', dot: 'bg-primary', text: 'text-primary' },
  Call: { icon: Phone, chip: 'bg-success/12', bar: 'border-l-success', dot: 'bg-success', text: 'text-success-strong' },
  Task: { icon: SquareCheckBig, chip: 'bg-warning/16', bar: 'border-l-warning', dot: 'bg-warning', text: 'text-warning-foreground' },
  'Follow-up': { icon: Repeat2, chip: 'bg-info/12', bar: 'border-l-info', dot: 'bg-info', text: 'text-info-strong' },
}

export const platformIcon: Record<EventPlatform, IconComponent> = { 'Google Meet': Video, Zoom: Video, Slack: Hash, 'In person': MapPin, Phone }
/** Where a "Join" link makes sense. The URLs are placeholders for the demo. */
export const joinUrl = (platform: EventPlatform | null, id: string): string | null =>
  platform === 'Google Meet' ? `https://meet.google.com/mesh-${id}` : platform === 'Zoom' ? `https://zoom.us/j/${id}` : platform === 'Slack' ? `https://app.slack.com/huddle/${id}` : null

export const derivedMeta = {
  'deal-close': { icon: Handshake, label: 'Deal closes' },
  'follow-up': { icon: BellRing, label: 'Follow-up due' },
} as const
