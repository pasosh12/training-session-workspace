import type { MouseEvent } from 'react'
import { formatListDateTime } from '../../../lib/datetime'
import { hrefWithParam } from '../../../lib/useUrlParam'
import type { Session } from '../model'
import { SESSION_TYPE_LABELS } from '../status'
import { StatusBadge } from '../ui/StatusBadge'

function placesLeft(session: Session): string {
  const left = session.capacity - session.bookedCount
  if (left <= 0) return 'No places left'
  return left === 1 ? '1 place left' : `${left} places left`
}

/**
 * One table for both viewports. Explicit ARIA table roles keep the semantics when the mobile
 * stylesheet changes `display` to stack the rows (ui-design §2.2).
 */
export function SessionsTable({
  sessions,
  newSessionId,
  onOpen,
}: {
  sessions: Session[]
  newSessionId: string | null
  onOpen: (sessionId: string, trigger: HTMLElement) => void
}) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, sessionId: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen(sessionId, event.currentTarget)
  }

  return (
    <table className="sessions-table" role="table">
      <caption className="visually-hidden">Training sessions</caption>
      <thead role="rowgroup" className="sessions-table__head">
        <tr role="row">
          <th role="columnheader" scope="col">Session</th>
          <th role="columnheader" scope="col">Start</th>
          <th role="columnheader" scope="col">Coach</th>
          <th role="columnheader" scope="col">Capacity</th>
          <th role="columnheader" scope="col">Status</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {sessions.map((session) => (
          <tr role="row" key={session.id} className="sessions-table__row">
            <td role="cell" className="cell-session">
              <a
                className="session-link"
                href={hrefWithParam('session', session.id)}
                data-session-id={session.id}
                onClick={(event) => handleClick(event, session.id)}
              >
                {session.title}
              </a>
              {session.id === newSessionId ? <span className="tag tag--new">New</span> : null}
              <span className="cell-meta">
                {SESSION_TYPE_LABELS[session.type]}
                <span aria-hidden="true"> · </span>
                <span className="visually-hidden">, </span>
                {session.location.name}
                {session.visibility === 'invite-only' ? <span className="tag">Invite only</span> : null}
              </span>
            </td>
            <td role="cell" className="cell-start">
              <span className="numeric">{formatListDateTime(session.startsAt)}</span>
              <span className="cell-meta">{session.durationMinutes} min</span>
            </td>
            <td role="cell" className="cell-coach">
              {session.coach.name}
            </td>
            <td role="cell" className="cell-capacity">
              <span className="numeric">
                {session.bookedCount} / {session.capacity}
              </span>
              <span className="mobile-only" aria-hidden="true">
                {' '}
                booked
              </span>
              <span className="cell-meta">{placesLeft(session)}</span>
            </td>
            <td role="cell" className="cell-status">
              <StatusBadge status={session.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
