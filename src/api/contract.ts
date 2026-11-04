// DTO types copied verbatim from frontend-accelerator-assessment/API_CONTRACT.md.
// Imported only by the API client (src/api) and the MSW mock layer (architecture AD-7).

export const SESSION_TYPES = ['training', 'camp', 'private'] as const
export const SESSION_STATUSES = ['scheduled', 'full', 'cancelled', 'completed'] as const
export const VISIBILITIES = ['public', 'invite-only'] as const

export type SessionType = (typeof SESSION_TYPES)[number]
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type Visibility = (typeof VISIBILITIES)[number]

export interface CoachSummary {
  id: string
  name: string
  email: string
}

export interface LocationSummary {
  name: string
  address: string
}

export interface SessionSummary {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  startsAt: string
  durationMinutes: number
  capacity: number
  bookedCount: number
  visibility: Visibility
  coach: CoachSummary
  location: LocationSummary
  updatedAt: string
}

export interface SessionDetails extends SessionSummary {
  description: string | null
  trainerNotes: string | null
  createdAt: string
  cancellation: null | {
    reason: string | null
    cancelledAt: string
  }
}

/** The contract's `ApiError` envelope (renamed to avoid confusion with the thrown error class). */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }
}

export interface SessionsResponse {
  data: SessionSummary[]
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export interface CoachesResponse {
  data: CoachSummary[]
}

export interface CreateSessionRequest {
  title: string
  type: SessionType
  startsAt: string
  durationMinutes: number
  coachId: string
  locationName: string
  locationAddress: string
  capacity: number
  visibility: Visibility
  description?: string | null
  trainerNotes?: string | null
}
