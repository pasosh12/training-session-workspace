import type {
  CoachSummary,
  CreateSessionRequest,
  SessionDetails,
  SessionStatus,
  SessionSummary,
} from '../api/contract'

export interface ListFilters {
  query: string
  status: SessionStatus | null
}

export interface MockStore {
  list(filters: ListFilters): SessionSummary[]
  get(id: string): SessionDetails | undefined
  create(request: CreateSessionRequest, coach: CoachSummary): SessionDetails
  coaches(): CoachSummary[]
}

function toSummary(details: SessionDetails): SessionSummary {
  const { description: _d, trainerNotes: _t, createdAt: _c, cancellation: _x, ...summary } = details
  return summary
}

function matchesQuery(session: SessionDetails, q: string): boolean {
  return [session.title, session.coach.name, session.location.name, session.location.address].some(
    (field) => field.toLowerCase().includes(q),
  )
}

export function createStore(options: {
  details: SessionDetails[]
  order: string[]
  coaches: CoachSummary[]
  seed: 'fixtures' | 'empty'
}): MockStore {
  const records = new Map<string, SessionDetails>()
  if (options.seed === 'fixtures') {
    const byId = new Map(options.details.map((d) => [d.id, d]))
    for (const id of options.order) {
      const record = byId.get(id)
      if (record) records.set(id, record)
    }
  }
  let counter = 0

  return {
    list({ query, status }) {
      const q = query.trim().toLowerCase()
      const result: SessionSummary[] = []
      for (const record of records.values()) {
        if (q !== '' && !matchesQuery(record, q)) continue
        if (status !== null && record.status !== status) continue
        result.push(toSummary(record))
      }
      return result
    },
    get(id) {
      return records.get(id)
    },
    create(request, coach) {
      counter += 1
      const now = new Date().toISOString()
      const optional = (value: string | null | undefined) => {
        const trimmed = value?.trim() ?? ''
        return trimmed === '' ? null : trimmed
      }
      const record: SessionDetails = {
        id: `ses_new_${counter}`,
        title: request.title.trim(),
        type: request.type,
        status: 'scheduled',
        startsAt: new Date(request.startsAt).toISOString(),
        durationMinutes: request.durationMinutes,
        capacity: request.capacity,
        bookedCount: 0,
        visibility: request.visibility,
        coach: { ...coach },
        location: { name: request.locationName.trim(), address: request.locationAddress.trim() },
        updatedAt: now,
        description: optional(request.description),
        trainerNotes: optional(request.trainerNotes),
        createdAt: now,
        cancellation: null,
      }
      records.set(record.id, record)
      return record
    },
    coaches() {
      return options.coaches
    },
  }
}
