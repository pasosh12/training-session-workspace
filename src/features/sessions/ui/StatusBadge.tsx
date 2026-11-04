import type { SessionStatus } from '../model'
import { STATUS_PRESENTATION, type StatusIcon } from '../status'

function Icon({ icon }: { icon: StatusIcon }) {
  return (
    <svg className="status-badge__icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      {icon === 'circle-open' ? <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {icon === 'circle-filled' ? <circle cx="6" cy="6" r="5" fill="currentColor" /> : null}
      {icon === 'cross' ? (
        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      ) : null}
      {icon === 'check' ? (
        <path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  )
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, icon, tone } = STATUS_PRESENTATION[status]
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <Icon icon={icon} />
      {label}
    </span>
  )
}
