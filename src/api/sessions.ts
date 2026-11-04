import { request } from './http'
import { toSessionDetails, toSessionsPage } from './mappers'
import type { CreateSessionRequest, SessionStatus } from './contract'
import type { SessionDetailsModel, SessionsPage } from './types'

export async function listSessions(
  filters: { query?: string; status?: SessionStatus },
  opts: { signal?: AbortSignal } = {},
): Promise<SessionsPage> {
  const query = new URLSearchParams()
  const q = filters.query?.trim() ?? ''
  if (q !== '') query.set('query', q)
  if (filters.status) query.set('status', filters.status)
  return toSessionsPage(await request('GET', '/sessions', { query, signal: opts.signal }))
}

export async function getSession(
  sessionId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<SessionDetailsModel> {
  return toSessionDetails(
    await request('GET', `/sessions/${encodeURIComponent(sessionId)}`, { signal: opts.signal }),
  )
}

/** No AbortSignal: aborting a POST cannot undo a server-side effect (api-integration §2.4). */
export async function createSession(body: CreateSessionRequest): Promise<SessionDetailsModel> {
  return toSessionDetails(await request('POST', '/sessions', { body }))
}
