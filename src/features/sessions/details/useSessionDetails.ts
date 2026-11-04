import { getSession } from '../../../api/sessions'
import type { SessionDetailsModel } from '../model'
import { useAsyncResource } from '../hooks/useAsyncResource'

export function useSessionDetails(sessionId: string | null) {
  return useAsyncResource<SessionDetailsModel>(
    (signal) => getSession(sessionId ?? '', { signal }),
    [sessionId],
    { enabled: sessionId !== null },
  )
}
