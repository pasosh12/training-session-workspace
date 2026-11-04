import type { Ref } from 'react'

/** Uses aria-disabled while pending so focus is never dropped (ui-design §8 rule). */
export function RetryButton({
  onRetry,
  pending,
  label = 'Try Again',
  pendingLabel = 'Trying again…',
  ref,
}: {
  onRetry: () => void
  pending: boolean
  label?: string
  pendingLabel?: string
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={ref}
      type="button"
      className="button button--secondary"
      aria-disabled={pending || undefined}
      onClick={() => {
        if (!pending) onRetry()
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
