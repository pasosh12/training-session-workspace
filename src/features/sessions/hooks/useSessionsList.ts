import { listSessions } from '../../../api/sessions'
import type { SessionFilters, SessionsPage } from '../model'
import { useAsyncResource } from './useAsyncResource'

export function useSessionsList(filters: SessionFilters, refreshKey: number) {
  const { query, status } = filters
  return useAsyncResource<SessionsPage>(
    (signal) => listSessions({ query, status: status === '' ? undefined : status }, { signal }),
    [query, status, refreshKey],
  )
}
