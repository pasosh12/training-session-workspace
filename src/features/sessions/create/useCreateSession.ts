import { useCallback, useRef, useState } from 'react'
import type { CreateSessionRequest } from '../../../api/types'
import { ApiRequestError, type ApiFailure } from '../../../api/errors'
import { createSession } from '../../../api/sessions'
import type { SessionDetailsModel } from '../model'

export type CreateState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; session: SessionDetailsModel }
  | { status: 'error'; failure: ApiFailure }

export type CreateResult = { ok: true; session: SessionDetailsModel } | { ok: false; failure: ApiFailure }

/** Create mutation with a synchronous in-flight guard; never aborted (AC-C5, api §2.4). */
export function useCreateSession() {
  const [state, setState] = useState<CreateState>({ status: 'idle' })
  const inFlight = useRef(false)

  const submit = useCallback(async (request: CreateSessionRequest): Promise<CreateResult | null> => {
    if (inFlight.current) return null
    inFlight.current = true
    setState({ status: 'pending' })
    try {
      const session = await createSession(request)
      setState({ status: 'success', session })
      return { ok: true, session }
    } catch (error) {
      const failure: ApiFailure =
        error instanceof ApiRequestError
          ? error.failure
          : { kind: 'contract', message: error instanceof Error ? error.message : 'Unexpected error' }
      setState({ status: 'error', failure })
      return { ok: false, failure }
    } finally {
      inFlight.current = false
    }
  }, [])

  return { state, submit, isPending: state.status === 'pending' }
}
