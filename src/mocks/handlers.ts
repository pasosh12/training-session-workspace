import { delay, http, HttpResponse } from 'msw'
import {
  SESSION_STATUSES,
  SESSION_TYPES,
  VISIBILITIES,
  type ApiErrorBody,
  type CreateSessionRequest,
  type SessionStatus,
  type SessionsResponse,
} from '../api/contract'
import { getMockState } from './controls'
import { getScenarioOverride } from './scenarios'

const PAGE_SIZE = 10
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/

function errorResponse(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  const body: ApiErrorBody = { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }
  return HttpResponse.json(body, { status })
}

/** Applies latency and the active scenario's override (api-integration §4, §5.6). */
async function prelude(request: Request) {
  const { latencyMs, scenario } = getMockState()
  if (latencyMs > 0) await delay(latencyMs)
  const override = getScenarioOverride(scenario, request.method, new URL(request.url).pathname)
  return override ? HttpResponse.json(override.body as ApiErrorBody, { status: override.status }) : null
}

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)

const nonEmptyString = (value: unknown) => typeof value === 'string' && value.trim() !== ''
const positiveInteger = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0
const optionalString = (value: unknown) => value === undefined || value === null || typeof value === 'string'

function validateCreate(body: Record<string, unknown>, coachIds: Set<string>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!nonEmptyString(body.title)) errors.title = 'Title is required.'
  if (!includes(SESSION_TYPES, body.type)) errors.type = 'Choose a supported session type.'
  if (!includes(VISIBILITIES, body.visibility)) errors.visibility = 'Choose a supported visibility.'
  if (
    typeof body.startsAt !== 'string' ||
    !ISO_TIMESTAMP.test(body.startsAt) ||
    Number.isNaN(Date.parse(body.startsAt))
  ) {
    errors.startsAt = 'Start time must be a valid ISO 8601 timestamp.'
  }
  if (!positiveInteger(body.durationMinutes)) errors.durationMinutes = 'Duration must be a positive whole number.'
  if (!positiveInteger(body.capacity)) errors.capacity = 'Capacity must be a positive whole number.'
  if (typeof body.coachId !== 'string' || !coachIds.has(body.coachId)) errors.coachId = 'Choose an existing coach.'
  if (!nonEmptyString(body.locationName)) errors.locationName = 'Location name is required.'
  if (!nonEmptyString(body.locationAddress)) errors.locationAddress = 'Location address is required.'
  if (!optionalString(body.description)) errors.description = 'Description must be text.'
  if (!optionalString(body.trainerNotes)) errors.trainerNotes = 'Trainer notes must be text.'
  return errors
}

export const handlers = [
  http.get('*/api/sessions', async ({ request }) => {
    const early = await prelude(request)
    if (early) return early

    const params = new URL(request.url).searchParams
    const queries = params.getAll('query')
    const statuses = params.getAll('status')
    const status = statuses[0]
    if (queries.length > 1 || statuses.length > 1 || (status !== undefined && !includes(SESSION_STATUSES, status))) {
      return errorResponse(400, 'INVALID_FILTER', 'The search or status filter is not valid.')
    }

    const filtered = getMockState().store.list({
      query: queries[0] ?? '',
      status: (status as SessionStatus | undefined) ?? null,
    })
    const body: SessionsResponse = {
      data: filtered.slice(0, PAGE_SIZE),
      meta: { page: 1, pageSize: PAGE_SIZE, total: filtered.length },
    }
    return HttpResponse.json(body)
  }),

  http.get('*/api/sessions/:sessionId', async ({ request, params }) => {
    const early = await prelude(request)
    if (early) return early

    const record = getMockState().store.get(String(params.sessionId))
    if (!record) {
      return errorResponse(404, 'SESSION_NOT_FOUND', 'The requested session no longer exists.')
    }
    return HttpResponse.json(record)
  }),

  http.get('*/api/coaches', async ({ request }) => {
    const early = await prelude(request)
    if (early) return early
    return HttpResponse.json({ data: getMockState().store.coaches() })
  }),

  http.post('*/api/sessions', async ({ request }) => {
    const early = await prelude(request)
    if (early) return early

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'VALIDATION_FAILED', 'The request body must be JSON.')
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse(400, 'VALIDATION_FAILED', 'The request body must be a JSON object.')
    }

    const { store } = getMockState()
    const coaches = store.coaches()
    const fields = body as Record<string, unknown>
    const fieldErrors = validateCreate(fields, new Set(coaches.map((c) => c.id)))
    if (Object.keys(fieldErrors).length > 0) {
      return errorResponse(400, 'VALIDATION_FAILED', 'Some fields need attention.', fieldErrors)
    }

    const createRequest = fields as unknown as CreateSessionRequest
    const coach = coaches.find((c) => c.id === createRequest.coachId)
    if (!coach) return errorResponse(400, 'VALIDATION_FAILED', 'Some fields need attention.', { coachId: 'Choose an existing coach.' })
    const created = store.create(createRequest, coach)
    return HttpResponse.json(created, { status: 201 })
  }),
]
