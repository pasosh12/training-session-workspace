import type { ReactNode } from 'react'

/** Error message with recovery actions; `role="alert"`. A new `announceKey` re-announces it. */
export function InlineError({
  title,
  body,
  actions,
  announceKey = 0,
  headingLevel = 3,
}: {
  title?: string
  body: string
  actions?: ReactNode
  announceKey?: number
  headingLevel?: 3 | 4
}) {
  const Heading = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <div className="inline-error">
      <div role="alert" key={announceKey} className="inline-error__message">
        {title ? <Heading className="inline-error__title">{title}</Heading> : null}
        <p>{body}</p>
      </div>
      {actions ? <div className="inline-error__actions">{actions}</div> : null}
    </div>
  )
}
