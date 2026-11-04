export type ApiFailure =
  | {
      kind: 'http'
      status: number
      code: string
      message: string
      fieldErrors?: Record<string, string>
    }
  | { kind: 'network'; message: string }
  | { kind: 'contract'; message: string }

/** The single error type thrown by the API client (api-integration §2.3). */
export class ApiRequestError extends Error {
  readonly failure: ApiFailure

  constructor(failure: ApiFailure) {
    super(failure.message)
    this.name = 'ApiRequestError'
    this.failure = failure
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  )
}

export function contractError(message: string): ApiRequestError {
  return new ApiRequestError({ kind: 'contract', message })
}
