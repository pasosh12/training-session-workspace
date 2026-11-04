import { ApiRequestError, contractError, isAbortError } from './errors'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'

interface RequestInit {
  query?: URLSearchParams
  body?: unknown
  signal?: AbortSignal
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  )
}

function toHttpFailure(status: number, body: unknown): ApiRequestError {
  const envelope =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error: unknown }).error
      : undefined
  if (
    typeof envelope === 'object' &&
    envelope !== null &&
    typeof (envelope as { code?: unknown }).code === 'string' &&
    typeof (envelope as { message?: unknown }).message === 'string'
  ) {
    const { code, message, fieldErrors } = envelope as {
      code: string
      message: string
      fieldErrors?: unknown
    }
    return new ApiRequestError({
      kind: 'http',
      status,
      code,
      message,
      ...(isStringRecord(fieldErrors) ? { fieldErrors } : {}),
    })
  }
  return new ApiRequestError({
    kind: 'http',
    status,
    code: `HTTP_${status}`,
    message: 'Unexpected server response',
  })
}

/**
 * The only `fetch` call in the application (architecture AD-7). Resolves with the parsed JSON
 * body as `unknown`; callers validate it through mappers. Abort errors are rethrown unchanged.
 */
export async function request(
  method: 'GET' | 'POST',
  path: string,
  { query, body, signal }: RequestInit = {},
): Promise<unknown> {
  const url = new URL(baseUrl + path, window.location.origin)
  if (query) url.search = query.toString()

  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiRequestError({ kind: 'network', message: 'Network request failed' })
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch (error) {
    if (isAbortError(error)) throw error
    if (!response.ok) throw toHttpFailure(response.status, undefined)
    throw contractError('Response body is not valid JSON')
  }

  if (!response.ok) throw toHttpFailure(response.status, parsed)
  return parsed
}
