import { useEffect, useLayoutEffect, useRef, useState, type DependencyList } from 'react'
import { ApiRequestError, isAbortError, type ApiFailure } from '../../../api/errors'

export type ResourceState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; isRefreshing: boolean }
  | { status: 'error'; error: ApiFailure; isRetrying: boolean; failureCount: number }

export interface Resource<T> {
  state: ResourceState<T>
  retry: () => void
  /** Increments each time a run settles (success or error); aborted runs don't count. */
  settled: number
}

function toFailure(error: unknown): ApiFailure {
  if (error instanceof ApiRequestError) return error.failure
  return { kind: 'contract', message: error instanceof Error ? error.message : 'Unexpected error' }
}

/**
 * One owner per remote resource (architecture AD-3): one AbortController per run, AbortError
 * ignored, previous data kept while refreshing, and the error kept visible while retrying.
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  { enabled = true }: { enabled?: boolean } = {},
): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>(enabled ? { status: 'loading' } : { status: 'idle' })
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState(0)
  // Set only by retry(): a re-run from an error caused by a key change is a new load, not a retry (R-6).
  const retryRequested = useRef(false)
  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    const isUserRetry = retryRequested.current
    retryRequested.current = false
    setState((prev) => {
      if (prev.status === 'success') return { ...prev, isRefreshing: true }
      if (prev.status === 'error' && isUserRetry) return { ...prev, isRetrying: true }
      return { status: 'loading' }
    })
    fetcherRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setState({ status: 'success', data, isRefreshing: false })
        setSettled((n) => n + 1)
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setState((prev) => ({
          status: 'error',
          error: toFailure(error),
          isRetrying: false,
          failureCount: prev.status === 'error' ? prev.failureCount + 1 : 1,
        }))
        setSettled((n) => n + 1)
      },
    )
    return () => controller.abort()
    // The caller's deps define the resource key; `attempt` re-runs it on retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt, enabled])

  const retry = () => {
    retryRequested.current = true
    setAttempt((n) => n + 1)
  }

  return { state, retry, settled }
}
