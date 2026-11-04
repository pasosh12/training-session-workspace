import { localDateTimeToDate } from '../lib/datetime'
import {
  SESSION_STATUSES,
  SESSION_TYPES,
  VISIBILITIES,
  type CreateSessionRequest,
} from './contract'
import { contractError } from './errors'
import type { Coach, Session, SessionDetailsModel, SessionsPage } from './types'

type Json = Record<string, unknown>

function obj(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw contractError(`${path} must be an object`)
  }
  return value as Json
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string') throw contractError(`${path} must be a string`)
  return value
}

function nullableStr(value: unknown, path: string): string | null {
  if (value === null) return null
  return str(value, path)
}

function int(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw contractError(`${path} must be an integer`)
  }
  return value
}

function oneOf<T extends string>(list: readonly T[], value: unknown, path: string): T {
  if (typeof value !== 'string' || !(list as readonly string[]).includes(value)) {
    throw contractError(`${path} has an unsupported value`)
  }
  return value as T
}

function date(value: unknown, path: string): Date {
  const parsed = new Date(str(value, path))
  if (Number.isNaN(parsed.getTime())) throw contractError(`${path} must be a valid timestamp`)
  return parsed
}

export function toCoach(value: unknown, path = 'coach'): Coach {
  const c = obj(value, path)
  return { id: str(c.id, `${path}.id`), name: str(c.name, `${path}.name`), email: str(c.email, `${path}.email`) }
}

export function toSession(value: unknown, path = 'session'): Session {
  const s = obj(value, path)
  const location = obj(s.location, `${path}.location`)
  return {
    id: str(s.id, `${path}.id`),
    title: str(s.title, `${path}.title`),
    type: oneOf(SESSION_TYPES, s.type, `${path}.type`),
    status: oneOf(SESSION_STATUSES, s.status, `${path}.status`),
    startsAt: date(s.startsAt, `${path}.startsAt`),
    durationMinutes: int(s.durationMinutes, `${path}.durationMinutes`),
    capacity: int(s.capacity, `${path}.capacity`),
    bookedCount: int(s.bookedCount, `${path}.bookedCount`),
    visibility: oneOf(VISIBILITIES, s.visibility, `${path}.visibility`),
    coach: toCoach(s.coach, `${path}.coach`),
    location: {
      name: str(location.name, `${path}.location.name`),
      address: str(location.address, `${path}.location.address`),
    },
    updatedAt: date(s.updatedAt, `${path}.updatedAt`),
  }
}

export function toSessionDetails(value: unknown): SessionDetailsModel {
  const d = obj(value, 'session')
  const cancellation =
    d.cancellation === null
      ? null
      : (() => {
          const c = obj(d.cancellation, 'session.cancellation')
          return {
            reason: nullableStr(c.reason, 'session.cancellation.reason'),
            cancelledAt: date(c.cancelledAt, 'session.cancellation.cancelledAt'),
          }
        })()
  return {
    ...toSession(d),
    description: nullableStr(d.description, 'session.description'),
    trainerNotes: nullableStr(d.trainerNotes, 'session.trainerNotes'),
    createdAt: date(d.createdAt, 'session.createdAt'),
    cancellation,
  }
}

export function toSessionsPage(value: unknown): SessionsPage {
  const body = obj(value, 'response')
  if (!Array.isArray(body.data)) throw contractError('response.data must be an array')
  const meta = obj(body.meta, 'response.meta')
  return {
    items: body.data.map((item, index) => toSession(item, `response.data[${index}]`)),
    total: int(meta.total, 'response.meta.total'),
    page: int(meta.page, 'response.meta.page'),
    pageSize: int(meta.pageSize, 'response.meta.pageSize'),
  }
}

export function toCoaches(value: unknown): Coach[] {
  const body = obj(value, 'response')
  if (!Array.isArray(body.data)) throw contractError('response.data must be an array')
  return body.data.map((item, index) => toCoach(item, `response.data[${index}]`))
}

/** Raw string input for building a create request; the create form's values have this shape. */
export interface CreateSessionInput {
  title: string
  type: string
  date: string
  time: string
  durationMinutes: string
  capacity: string
  coachId: string
  locationName: string
  locationAddress: string
  visibility: string
  description: string
  trainerNotes: string
}

/**
 * Builds the contract request from already-validated form values (api-integration §2.1, AD-5):
 * trims text, converts the local date and time to an ISO UTC string, and sends empty optional text as null.
 */
export function toCreateSessionRequest(values: CreateSessionInput): CreateSessionRequest {
  const startsAt = localDateTimeToDate(values.date, values.time)
  if (startsAt === null) throw new Error('toCreateSessionRequest requires a valid date and time')
  const optional = (text: string) => (text.trim() === '' ? null : text.trim())
  return {
    title: values.title.trim(),
    type: oneOf(SESSION_TYPES, values.type, 'type'),
    startsAt: startsAt.toISOString(),
    durationMinutes: Number(values.durationMinutes),
    coachId: values.coachId,
    locationName: values.locationName.trim(),
    locationAddress: values.locationAddress.trim(),
    capacity: Number(values.capacity),
    visibility: oneOf(VISIBILITIES, values.visibility, 'visibility'),
    description: optional(values.description),
    trainerNotes: optional(values.trainerNotes),
  }
}
