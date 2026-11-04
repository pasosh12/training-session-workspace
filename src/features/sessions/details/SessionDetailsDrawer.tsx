import { useEffect, useRef } from 'react'
import { formatDetailsRange, formatTimestamp } from '../../../lib/datetime'
import { failureCopy, isNotFound } from '../copy'
import type { SessionDetailsModel } from '../model'
import { SESSION_TYPE_LABELS, VISIBILITY_LABELS } from '../status'
import { Drawer } from '../ui/Drawer'
import { InlineError } from '../ui/InlineError'
import { RetryButton } from '../ui/RetryButton'
import { StatusBadge } from '../ui/StatusBadge'
import { useSessionDetails } from './useSessionDetails'

function capacityText(session: SessionDetailsModel): string {
  const left = session.capacity - session.bookedCount
  return `${session.bookedCount} booked of ${session.capacity} places · ${left <= 0 ? 'Full' : `${left} left`}`
}

function DetailsContent({ session }: { session: SessionDetailsModel }) {
  const fill = session.capacity > 0 ? Math.min(100, (session.bookedCount / session.capacity) * 100) : 0
  return (
    <>
      <div className="details-summary">
        <StatusBadge status={session.status} />
        <span className="details-summary__meta">
          {SESSION_TYPE_LABELS[session.type]} · {VISIBILITY_LABELS[session.visibility]}
        </span>
      </div>

      {session.cancellation ? (
        <section className="cancellation" aria-labelledby="cancellation-heading">
          <h3 id="cancellation-heading">
            <span aria-hidden="true">✕ </span>Cancelled
          </h3>
          <p>Cancelled on {formatTimestamp(session.cancellation.cancelledAt)}.</p>
          <p>
            {session.cancellation.reason ? `Reason: ${session.cancellation.reason}` : 'No reason was given.'}
          </p>
        </section>
      ) : null}

      <dl className="details-list">
        <div>
          <dt>Start</dt>
          <dd>{formatDetailsRange(session.startsAt, session.durationMinutes)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{session.durationMinutes} minutes</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            {session.location.name}
            <br />
            {session.location.address}
          </dd>
        </div>
        <div>
          <dt>Coach</dt>
          <dd>
            {session.coach.name}
            <br />
            <a href={`mailto:${session.coach.email}`}>{session.coach.email}</a>
          </dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>
            {capacityText(session)}
            <span className="meter" aria-hidden="true">
              <span className="meter__fill" style={{ width: `${fill}%` }} />
            </span>
          </dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd className={session.description ? 'prewrap' : 'none-value'}>
            {session.description ?? 'No description.'}
          </dd>
        </div>
        <div>
          <dt>Trainer notes</dt>
          <dd className={session.trainerNotes ? 'prewrap' : 'none-value'}>
            {session.trainerNotes ?? 'No trainer notes.'}
          </dd>
        </div>
        <div className="details-list__timestamps">
          <dt>Created</dt>
          <dd>{formatTimestamp(session.createdAt)}</dd>
        </div>
        <div className="details-list__timestamps">
          <dt>Last updated</dt>
          <dd>{formatTimestamp(session.updatedAt)}</dd>
        </div>
      </dl>
    </>
  )
}

/** Open state is derived only from the `session` URL param (architecture AD-1). */
export function SessionDetailsDrawer({
  sessionId,
  knownTitle,
  onClose,
}: {
  sessionId: string | null
  knownTitle: string | null
  onClose: () => void
}) {
  const { state, retry } = useSessionDetails(sessionId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const isOpen = sessionId !== null

  // F9: after a successful retry the retry button unmounts, so focus moves to the heading.
  const previousStatus = useRef(state.status)
  useEffect(() => {
    if (previousStatus.current === 'error' && state.status === 'success') headingRef.current?.focus()
    previousStatus.current = state.status
  }, [state.status])

  const data = state.status === 'success' && state.data.id === sessionId ? state.data : null
  const title = data?.title ?? knownTitle ?? 'Session details'

  let body
  if (data) {
    body = <DetailsContent session={data} />
  } else if (state.status === 'error') {
    const copy = failureCopy('details', state.error)
    const notFound = isNotFound(state.error)
    body = (
      <InlineError
        title={copy.title}
        body={copy.body}
        announceKey={state.failureCount}
        actions={
          <>
            {notFound ? null : (
              <RetryButton
                pending={state.isRetrying}
                onRetry={() => {
                  retry()
                }}
              />
            )}
            <button type="button" className="button button--secondary" onClick={onClose}>
              Back to Sessions
            </button>
          </>
        }
      />
    )
  } else {
    body = <p className="details-loading">Loading session details…</p>
  }

  const busy = isOpen && data === null && state.status !== 'error'

  return (
    <Drawer
      isOpen={isOpen}
      size="details"
      eyebrow="Session details"
      title={title}
      closeLabel="Close details"
      headingRef={headingRef}
      onBackdropClick={onClose}
      onCloseRequest={() => {
        onClose()
        return 'close'
      }}
      footer={
        <button type="button" className="button button--secondary button--block" onClick={onClose}>
          Back to sessions
        </button>
      }
    >
      <div aria-busy={busy || undefined}>{body}</div>
    </Drawer>
  )
}

