import type { ReactNode, RefObject } from 'react'
import { failureCopy, sessionCount } from '../copy'
import type { ResourceState } from '../hooks/useAsyncResource'
import { hasActiveFilters, type SessionFilters, type SessionsPage } from '../model'
import { STATUS_PRESENTATION } from '../status'
import { EmptyState } from '../ui/EmptyState'
import { InlineError } from '../ui/InlineError'
import { RetryButton } from '../ui/RetryButton'

function noMatchesText(filters: SessionFilters): string {
  const query = filters.query.trim()
  const status = filters.status === '' ? null : STATUS_PRESENTATION[filters.status].label
  if (query && status) return `No sessions match “${query}” with status ${status}.`
  if (query) return `No sessions match “${query}”.`
  return `No sessions have the status ${status ?? ''}.`
}

export function ResultsSection({
  state,
  filters,
  announcement,
  headingRef,
  retryRef,
  onRetry,
  onClearFilters,
  onCreate,
  children,
}: {
  state: ResourceState<SessionsPage>
  filters: SessionFilters
  announcement: string
  headingRef: RefObject<HTMLHeadingElement | null>
  retryRef: RefObject<HTMLButtonElement | null>
  onRetry: () => void
  onClearFilters: () => void
  onCreate: (trigger: HTMLElement) => void
  children: (page: SessionsPage) => ReactNode
}) {
  const heading =
    state.status === 'success'
      ? state.data.total === 0
        ? 'No sessions'
        : sessionCount(state.data.total)
      : 'Sessions'

  let body: ReactNode = null
  if (state.status === 'loading' || state.status === 'idle') {
    body = (
      <div className="results-loading" aria-hidden="true">
        <span className="spinner" /> Loading sessions…
      </div>
    )
  } else if (state.status === 'error') {
    const copy = failureCopy('list', state.error)
    const invalidFilter = state.error.kind === 'http' && state.error.code === 'INVALID_FILTER'
    body = (
      <InlineError
        title={copy.title}
        body={copy.body}
        announceKey={state.failureCount}
        actions={
          invalidFilter ? (
            <button type="button" className="button button--secondary" onClick={onClearFilters}>
              Clear Filters
            </button>
          ) : (
            <RetryButton ref={retryRef} pending={state.isRetrying} onRetry={onRetry} />
          )
        }
      />
    )
  } else if (state.data.total === 0 && !hasActiveFilters(filters)) {
    body = (
      <EmptyState
        title="No sessions yet"
        action={
          <button type="button" className="button button--primary" onClick={(e) => onCreate(e.currentTarget)}>
            Create session
          </button>
        }
      >
        <p>Create the first session to start building the schedule.</p>
      </EmptyState>
    )
  } else if (state.data.items.length === 0) {
    body = (
      <EmptyState
        title="No matching sessions"
        action={
          <button type="button" className="button button--secondary" onClick={onClearFilters}>
            Clear filters
          </button>
        }
      >
        <p>{noMatchesText(filters)}</p>
        <p>Try a different search or clear the filters.</p>
      </EmptyState>
    )
  } else {
    body = children(state.data)
  }

  return (
    <section
      className="results"
      aria-labelledby="results-heading"
      aria-busy={state.status === 'loading' || (state.status === 'success' && state.isRefreshing) || undefined}
    >
      <div className="results__header">
        <h2 id="results-heading" ref={headingRef} tabIndex={-1}>
          {heading}
        </h2>
        {state.status === 'success' && state.isRefreshing ? (
          <span className="results__updating">
            <span className="spinner" aria-hidden="true" /> Updating…
          </span>
        ) : null}
      </div>
      <p role="status" className="visually-hidden">
        {announcement}
      </p>
      {body}
    </section>
  )
}
