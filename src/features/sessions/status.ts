import type { SessionStatus } from './model'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'
export type StatusIcon = 'circle-open' | 'circle-filled' | 'cross' | 'check'

/** Text label is the meaning; icon shape and color only reinforce it (ui-design §5). */
export const STATUS_PRESENTATION: Record<SessionStatus, { label: string; icon: StatusIcon; tone: StatusTone }> = {
  scheduled: { label: 'Scheduled', icon: 'circle-open', tone: 'success' },
  full: { label: 'Full', icon: 'circle-filled', tone: 'warning' },
  cancelled: { label: 'Cancelled', icon: 'cross', tone: 'danger' },
  completed: { label: 'Completed', icon: 'check', tone: 'neutral' },
}

export const SESSION_TYPE_LABELS = {
  training: 'Training',
  camp: 'Camp',
  private: 'Private',
} as const

export const VISIBILITY_LABELS = {
  public: 'Public',
  'invite-only': 'Invite only',
} as const
