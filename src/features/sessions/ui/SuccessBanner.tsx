import type { ReactNode } from 'react'

/** Persistent polite status container; content appears only while there is a message (ui §7, L2). */
export function SuccessBanner({ message, actions }: { message: ReactNode | null; actions?: ReactNode }) {
  return (
    <div className={message ? 'success-banner' : 'success-banner success-banner--empty'}>
      <div role="status" className="success-banner__message">
        {message ? (
          <>
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true" focusable="false">
              <path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span>{message}</span>
          </>
        ) : null}
      </div>
      {message && actions ? <div className="success-banner__actions">{actions}</div> : null}
    </div>
  )
}
