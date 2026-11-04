// Domain types returned by the API client (architecture AD-5, AD-7 amendment 2026-11-04).
// Timestamps are `Date` objects; DTO shapes with ISO strings stay in contract.ts.
import type { SessionStatus, SessionType, Visibility } from './contract'

export type { SessionStatus, SessionType, Visibility }
export { SESSION_STATUSES, SESSION_TYPES, VISIBILITIES } from './contract'

export interface Coach {
  id: string
  name: string
  email: string
}

export interface Session {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  startsAt: Date
  durationMinutes: number
  capacity: number
  bookedCount: number
  visibility: Visibility
  coach: Coach
  location: { name: string; address: string }
  updatedAt: Date
}

export interface SessionDetailsModel extends Session {
  description: string | null
  trainerNotes: string | null
  createdAt: Date
  cancellation: { reason: string | null; cancelledAt: Date } | null
}

export interface SessionsPage {
  items: Session[]
  total: number
  page: number
  pageSize: number
}
