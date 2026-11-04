import { useCallback, useMemo, useSyncExternalStore } from 'react'

// History-backed search parameter (architecture AD-1, amended). Only the named key is changed;
// every other query parameter, the pathname, and the hash are preserved on each write.

const CHANGE_EVENT = 'urlparamchange'
const PUSHED_KEY = '__pushedUrlParam'

function subscribe(callback: () => void): () => void {
  window.addEventListener('popstate', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

function urlWith(name: string, value: string | null): string {
  const params = new URLSearchParams(window.location.search)
  if (value === null) params.delete(name)
  else params.set(name, value)
  const search = params.toString()
  return `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`
}

function currentState(): Record<string, unknown> {
  const state: unknown = window.history.state
  return typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {}
}

export interface UrlParamActions {
  /** Adds a history entry with the parameter set. */
  push(value: string): void
  /** Removes the parameter: goes back if this hook pushed the entry, otherwise replaces it. */
  close(): void
}

export function useUrlParam(name: string): [string | null, UrlParamActions] {
  const getSnapshot = useCallback(
    () => new URLSearchParams(window.location.search).get(name),
    [name],
  )
  const value = useSyncExternalStore(subscribe, getSnapshot, () => null)

  const push = useCallback(
    (next: string) => {
      if (new URLSearchParams(window.location.search).get(name) === next) return
      window.history.pushState({ ...currentState(), [PUSHED_KEY]: name }, '', urlWith(name, next))
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [name],
  )

  const close = useCallback(() => {
    if (new URLSearchParams(window.location.search).get(name) === null) return
    const state = currentState()
    if (state[PUSHED_KEY] === name) {
      window.history.back()
      return
    }
    const { [PUSHED_KEY]: _ignored, ...rest } = state
    window.history.replaceState(rest, '', urlWith(name, null))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [name])

  const actions = useMemo(() => ({ push, close }), [push, close])
  return [value, actions]
}
