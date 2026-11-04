import type { RefObject } from 'react'
import { hasActiveFilters, SESSION_STATUSES, type SessionFilters, type SessionStatus } from '../model'
import { STATUS_PRESENTATION } from '../status'

export function FilterBar({
  filters,
  onChange,
  onClear,
  searchInputRef,
}: {
  filters: SessionFilters
  onChange: (next: SessionFilters) => void
  onClear: () => void
  searchInputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <section className="filter-bar" aria-labelledby="filters-heading">
      <h2 id="filters-heading" className="visually-hidden">
        Filters
      </h2>
      <div className="filter-bar__field filter-bar__field--search">
        <label htmlFor="session-search">Search</label>
        <input
          ref={searchInputRef}
          id="session-search"
          type="search"
          name="query"
          autoComplete="off"
          placeholder="Title, coach, or location…"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
        />
      </div>
      <div className="filter-bar__field filter-bar__field--status">
        <label htmlFor="session-status">Status</label>
        <select
          id="session-status"
          name="status"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as SessionStatus | '' })}
        >
          <option value="">All statuses</option>
          {SESSION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_PRESENTATION[status].label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="button button--text filter-bar__clear"
        disabled={!hasActiveFilters(filters)}
        onClick={onClear}
      >
        Clear filters
      </button>
    </section>
  )
}
