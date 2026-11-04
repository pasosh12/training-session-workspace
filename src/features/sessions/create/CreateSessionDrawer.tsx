import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { toCreateSessionRequest } from '../../../api/mappers'
import { createFailureCopy } from '../copy'
import type { SessionDetailsModel } from '../model'
import { Drawer, type CloseDecision } from '../ui/Drawer'
import { CREATE_FORM_ID, CreateSessionForm, SUBMIT_HINT_ID, type FormError } from './CreateSessionForm'
import { FIELD_ORDER, initialValues, isDirty, type CreateSessionFormValues, type FieldName } from './formValues'
import { useCoaches } from './useCoaches'
import { useCreateSession } from './useCreateSession'
import { mapServerFieldErrors, validate, type FieldErrors } from './validation'

/**
 * Create drawer (ui-design §4). Open state is local to the workspace (Q-1). Owns the form values,
 * the discard confirmation (§4.4), and the native-dialog self-close reconciliation (§4.4.1).
 * Mount it with a new `key` per opening so the form starts clean.
 */
export function CreateSessionDrawer({
  isOpen,
  onClose,
  onCreated,
  onRefreshList,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: (session: SessionDetailsModel) => void
  onRefreshList: () => void
}) {
  const [values, setValues] = useState<CreateSessionFormValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  // Server-mapped field errors, kept until their own field is edited (review R-7).
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [formError, setFormError] = useState<FormError | null>(null)
  const [showDiscard, setShowDiscard] = useState(false)

  const coachesResource = useCoaches(isOpen)
  const coaches = coachesResource.state
  const { submit, isPending } = useCreateSession()

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement | null>>>({})
  const formErrorRef = useRef<HTMLDivElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  const focusBeforeCloseAttempt = useRef<HTMLElement | null>(null)
  const pendingRef = useRef(false)
  useLayoutEffect(() => {
    pendingRef.current = isPending
  }, [isPending])

  const coachIds = useMemo(
    () => new Set(coaches.status === 'success' ? coaches.data.map((c) => c.id) : []),
    [coaches],
  )
  const dirty = isDirty(values)

  // Leaving the page while dirty or pending asks first (§4.4).
  useEffect(() => {
    if (!isOpen || (!dirty && !isPending)) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isOpen, dirty, isPending])

  // F19 / F37: focus Keep editing when the discard bar appears; F20 / F38: restore when it goes.
  const previousShowDiscard = useRef(false)
  useEffect(() => {
    if (showDiscard && !previousShowDiscard.current) keepEditingRef.current?.focus()
    if (!showDiscard && previousShowDiscard.current) {
      const target = focusBeforeCloseAttempt.current
      ;(target && target.isConnected ? target : fieldRefs.current.title)?.focus()
    }
    previousShowDiscard.current = showDiscard
  }, [showDiscard])

  // F31: after a successful coaches retry, focus the coach select.
  const previousCoachStatus = useRef(coaches.status)
  useEffect(() => {
    if (previousCoachStatus.current === 'error' && coaches.status === 'success') {
      fieldRefs.current.coachId?.focus()
    }
    previousCoachStatus.current = coaches.status
  }, [coaches.status])

  const rememberFocus = () => {
    const active = document.activeElement
    focusBeforeCloseAttempt.current = active instanceof HTMLElement ? active : null
  }

  /** Single close-request policy for ×, Cancel, Escape, cancel, and self-close (§4.4, §4.4.1). */
  const requestClose = (): CloseDecision => {
    if (pendingRef.current) return 'stay'
    if (showDiscard) {
      setShowDiscard(false) // Escape on the bar = Keep editing
      return 'stay'
    }
    if (dirty) {
      rememberFocus()
      setShowDiscard(true)
      return 'stay'
    }
    onClose()
    return 'close'
  }

  const setField = (name: FieldName, value: string) => {
    if (pendingRef.current) return
    const next = { ...values, [name]: value }
    setValues(next)
    if (submitAttempted) setErrors(validate(next, new Date(), coachIds))
    // `startsAt` is shown on the Start group (mapped to `date`), so editing date or time clears it.
    const clears: FieldName[] = name === 'time' ? ['time', 'date'] : [name]
    setServerErrors((current) => {
      if (!clears.some((field) => current[field])) return current
      const next = { ...current }
      for (const field of clears) delete next[field]
      return next
    })
  }

  const blurField = (name: FieldName) => {
    if (submitAttempted || values[name] === initialValues[name]) return
    const fieldError = validate(values, new Date(), coachIds)[name]
    setErrors((current) => ({ ...current, [name]: fieldError }))
  }

  const focusFirstError = (fieldErrors: FieldErrors) => {
    const first = FIELD_ORDER.find((name) => fieldErrors[name])
    if (first) fieldRefs.current[first]?.focus()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pendingRef.current || coaches.status !== 'success') return
    setSubmitAttempted(true)
    setFormError(null)
    setServerErrors({})
    const clientErrors = validate(values, new Date(), coachIds)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) {
      focusFirstError(clientErrors) // F22
      return
    }

    pendingRef.current = true
    const result = await submit(toCreateSessionRequest(values))
    if (result === null) return
    if (result.ok) {
      onCreated(result.session)
      return
    }

    const { failure } = result
    if (failure.kind === 'http' && failure.code === 'VALIDATION_FAILED' && failure.fieldErrors) {
      const { fields, unmapped } = mapServerFieldErrors(failure.fieldErrors)
      const hasMapped = Object.keys(fields).length > 0
      setErrors({})
      setServerErrors(fields)
      setFormError({ ...createFailureCopy(failure, hasMapped), details: unmapped })
      if (hasMapped) {
        focusFirstError(fields) // F24
      } else {
        requestAnimationFrame(() => formErrorRef.current?.focus()) // F25
      }
      return
    }
    const copy = createFailureCopy(failure, false)
    setFormError({ ...copy, details: [] })
    if (failure.kind === 'http' && failure.code === 'VALIDATION_FAILED') {
      requestAnimationFrame(() => formErrorRef.current?.focus()) // F25
    }
    // F26: otherwise focus stays on the submit button.
  }

  const initialFocusRef = useMemo(
    () => ({
      get current() {
        return fieldRefs.current.title ?? null
      },
    }),
    [],
  )

  const coachesReady = coaches.status === 'success'
  const footer = showDiscard ? (
    <div className="discard-bar" role="group" aria-labelledby="discard-question">
      <p id="discard-question" role="status">
        Discard this new session? The details you entered will be lost.
      </p>
      <div className="discard-bar__actions">
        <button
          ref={keepEditingRef}
          type="button"
          className="button button--secondary"
          onClick={() => setShowDiscard(false)}
        >
          Keep Editing
        </button>
        <button type="button" className="button button--danger-text" onClick={onClose}>
          Discard
        </button>
      </div>
    </div>
  ) : (
    <div className="drawer-actions">
      {coachesReady ? null : (
        <p className="drawer-actions__hint" id={SUBMIT_HINT_ID}>
          Creating is unavailable until coaches load.
        </p>
      )}
      <button
        type="button"
        className="button button--secondary"
        aria-disabled={isPending || undefined}
        onClick={() => {
          if (!isPending) requestClose()
        }}
      >
        Cancel
      </button>
      <button
        ref={submitRef}
        type="submit"
        form={CREATE_FORM_ID}
        className="button button--primary button--stable"
        disabled={!coachesReady}
        aria-disabled={isPending || undefined}
        aria-describedby={coachesReady ? undefined : SUBMIT_HINT_ID}
      >
        {isPending ? (
          <>
            <span className="spinner spinner--on-primary" aria-hidden="true" /> Creating…
          </>
        ) : (
          'Create session'
        )}
      </button>
    </div>
  )

  return (
    <Drawer
      isOpen={isOpen}
      size="create"
      title="Create session"
      closeLabel="Close create form"
      closeDisabled={isPending}
      initialFocusRef={initialFocusRef}
      onCloseRequest={requestClose}
      onReopened={() => {
        if (pendingRef.current) submitRef.current?.focus() // F39
      }}
      footer={footer}
    >
      {isOpen ? (
        <CreateSessionForm
          values={values}
          errors={{ ...errors, ...serverErrors }}
          pending={isPending}
          coaches={coaches}
          formError={formError}
          formErrorRef={formErrorRef}
          fieldRefs={fieldRefs}
          coachRetryPending={coaches.status === 'error' && coaches.isRetrying}
          onField={setField}
          onBlurField={blurField}
          onSubmit={(event) => void handleSubmit(event)}
          onRetryCoaches={coachesResource.retry}
          onCheckList={onRefreshList}
        />
      ) : null}
    </Drawer>
  )
}
