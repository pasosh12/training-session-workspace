// Feature-only types. Domain types are owned by src/api/types.ts (AD-7 amendment 2026-11-04)
// and re-exported here for convenience.
import type { SessionStatus } from '../../api/types'

export type {
  Coach,
  Session,
  SessionDetailsModel,
  SessionsPage,
  SessionStatus,
  SessionType,
  Visibility,
} from '../../api/types'
export { SESSION_STATUSES, SESSION_TYPES, VISIBILITIES } from '../../api/types'

export interface SessionFilters {
  query: string
  status: SessionStatus | ''
}

export const EMPTY_FILTERS: SessionFilters = { query: '', status: '' }

export function hasActiveFilters(filters: SessionFilters): boolean {
  return filters.query.trim() !== '' || filters.status !== ''
}
