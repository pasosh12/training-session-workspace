import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useUrlParam } from '../../lib/useUrlParam'
import { sessionCount } from './copy'
import { CreateSessionDrawer } from './create/CreateSessionDrawer'
import { SessionDetailsDrawer } from './details/SessionDetailsDrawer'
import { useSessionsList } from './hooks/useSessionsList'
import { FilterBar } from './list/FilterBar'
import { ResultsSection } from './list/ResultsSection'
import { SessionsTable } from './list/SessionsTable'
import { EMPTY_FILTERS, hasActiveFilters, type SessionDetailsModel, type SessionFilters } from './model'
import { SuccessBanner } from './ui/SuccessBanner'

type DiscoverPhase = 'pending' | 'present' | 'hidden' | 'failed'

interface LastCreated {
  id: string
  title: string
  /** `list.settled` when the session was created. */
  since: number
}

/** Single-pending-announcement window for the success banner (ui-design §7). */
const BANNER_SETTLE_MS = 500

/**
 * Owns filter state, the list refresh key, create feedback, and the URL-driven details param
 * (architecture AD-1 to AD-4).
 */
export function SessionsWorkspace() {
  const [filters, setFilters] = useState<SessionFilters>(EMPTY_FILTERS)
  const debouncedQuery = useDebouncedValue(filters.query, 300)
  // An emptied search applies immediately (clear filters, erased input); typing is debounced.
  const effectiveQuery = filters.query.trim() === '' ? '' : debouncedQuery
  const [refreshKey, setRefreshKey] = useState(0)
  const list = useSessionsList({ query: effectiveQuery, status: filters.status }, refreshKey)

  const [sessionId, sessionParam] = useUrlParam('session')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [createKey, setCreateKey] = useState(0)
  const [lastCreated, setLastCreated] = useState<LastCreated | null>(null)
  const [bannerSettled, setBannerSettled] = useState(false)
  const [listCheckRequested, setListCheckRequested] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)
  const listRetryRef = useRef<HTMLButtonElement>(null)
  const headerCreateRef = useRef<HTMLButtonElement>(null)
  const bannerOpenRef = useRef<HTMLButtonElement>(null)
  const createTrigger = useRef<HTMLElement | null>(null)
  const focusHeaderAfterCreate = useRef(false)
  const detailsOpenedFromBanner = useRef(false)

  // Discoverability of a newly created session, derived from the first list run that settles
  // after the create (AD-4). The refresh aborts any older in-flight run.
  const listState = list.state
  let phase: DiscoverPhase | null = null
  if (lastCreated) {
    if (list.settled <= lastCreated.since) phase = 'pending'
    else if (listState.status === 'success') {
      phase = listState.data.items.some((item) => item.id === lastCreated.id) ? 'present' : 'hidden'
    } else if (listState.status === 'error') phase = 'failed'
    else phase = 'pending'
  }

  const createdId = lastCreated?.id ?? null
  useEffect(() => {
    if (createdId === null) return
    const timer = window.setTimeout(() => setBannerSettled(true), BANNER_SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [createdId])

  // F12: a successful list retry moves focus to the results heading.
  const previousListStatus = useRef(listState.status)
  useEffect(() => {
    if (
      previousListStatus.current === 'error' &&
      listState.status === 'success' &&
      document.activeElement === listRetryRef.current
    ) {
      resultsHeadingRef.current?.focus()
    }
    previousListStatus.current = listState.status
  }, [listState.status])

  // F5–F7: after details close, focus that session's row link, else the results heading.
  const previousSessionId = useRef<string | null>(sessionId)
  useEffect(() => {
    const closedId = previousSessionId.current
    previousSessionId.current = sessionId
    if (closedId === null || sessionId !== null) return
    if (detailsOpenedFromBanner.current) {
      detailsOpenedFromBanner.current = false
      setLastCreated(null) // the banner's job is done (§7)
    }
    const link = document.querySelector<HTMLElement>(`a[data-session-id="${CSS.escape(closedId)}"]`)
    ;(link ?? resultsHeadingRef.current)?.focus()
  }, [sessionId])

  // F18, F21, F27: after the create drawer closes, focus its trigger or the header button.
  const previousCreateOpen = useRef(isCreateOpen)
  useEffect(() => {
    const wasOpen = previousCreateOpen.current
    previousCreateOpen.current = isCreateOpen
    if (!wasOpen || isCreateOpen) return
    const trigger = createTrigger.current
    if (focusHeaderAfterCreate.current || !trigger?.isConnected) {
      focusHeaderAfterCreate.current = false
      headerCreateRef.current?.focus()
    } else {
      trigger.focus()
    }
  }, [isCreateOpen])

  const updateFilters = (next: SessionFilters) => {
    setListCheckRequested(false)
    setFilters(next)
  }

  const clearFilters = () => {
    updateFilters(EMPTY_FILTERS)
    searchInputRef.current?.focus() // F14, F15
  }

  const openCreate = (trigger: HTMLElement) => {
    createTrigger.current = trigger
    setCreateKey((k) => k + 1)
    setCreateOpen(true)
  }

  const handleCreated = (session: SessionDetailsModel) => {
    focusHeaderAfterCreate.current = true
    setCreateOpen(false)
    setBannerSettled(false)
    setLastCreated({ id: session.id, title: session.title, since: list.settled })
    setRefreshKey((k) => k + 1)
  }

  const openSession = (id: string, fromBanner = false) => {
    detailsOpenedFromBanner.current = fromBanner
    sessionParam.push(id)
  }

  const showAllSessions = () => {
    updateFilters(EMPTY_FILTERS)
    bannerOpenRef.current?.focus() // F28
  }

  const dismissBanner = () => {
    setLastCreated(null)
    resultsHeadingRef.current?.focus() // F29
  }

  // Results status text (L1): derived, so an unchanged count is not re-announced.
  let announcement = ''
  if (listState.status === 'loading') announcement = 'Loading sessions…'
  else if (listState.status === 'success') {
    const { total } = listState.data
    const text =
      total > 0 ? sessionCount(total) : hasActiveFilters(filters) ? 'No sessions match these filters' : 'No sessions'
    announcement = listCheckRequested && !listState.isRefreshing ? `List updated: ${text}` : text
  }

  const knownTitle =
    sessionId !== null && listState.status === 'success'
      ? (listState.data.items.find((item) => item.id === sessionId)?.title ?? null)
      : null

  const finalPhase = phase !== null && phase !== 'pending'
  const showBanner = lastCreated !== null && (finalPhase || bannerSettled)
  let bannerMessage: string | null = null
  if (lastCreated && showBanner) {
    const base = `Session “${lastCreated.title}” created.`
    if (phase === 'present') bannerMessage = `${base} It's marked New in the list.`
    else if (phase === 'hidden') bannerMessage = `${base} The current filters hide it.`
    else if (phase === 'failed') bannerMessage = `${base} The list couldn't refresh.`
    else bannerMessage = base
  }

  return (
    <>
      <header className="page-header">
        <div className="page-header__text">
          <h1>Training sessions</h1>
          <p className="page-header__subtitle">Find scheduled work, review capacity, and create sessions.</p>
        </div>
        <button
          ref={headerCreateRef}
          type="button"
          className="button button--primary page-header__create"
          onClick={(event) => openCreate(event.currentTarget)}
        >
          Create session
        </button>
      </header>

      <main className="page-main">
        <SuccessBanner
          message={bannerMessage}
          actions={
            lastCreated ? (
              <>
                <button
                  ref={bannerOpenRef}
                  type="button"
                  className="button button--secondary"
                  onClick={() => openSession(lastCreated.id, true)}
                >
                  Open Session
                </button>
                {phase === 'hidden' ? (
                  <button type="button" className="button button--secondary" onClick={showAllSessions}>
                    Show All Sessions
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button button--icon"
                  aria-label="Dismiss message"
                  onClick={dismissBanner}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </>
            ) : null
          }
        />

        <FilterBar filters={filters} onChange={updateFilters} onClear={clearFilters} searchInputRef={searchInputRef} />

        <ResultsSection
          state={listState}
          filters={{ query: effectiveQuery, status: filters.status }}
          announcement={announcement}
          headingRef={resultsHeadingRef}
          retryRef={listRetryRef}
          onRetry={list.retry}
          onClearFilters={clearFilters}
          onCreate={openCreate}
        >
          {(page) => (
            <SessionsTable
              sessions={page.items}
              newSessionId={lastCreated?.id ?? null}
              onOpen={(id) => openSession(id)}
            />
          )}
        </ResultsSection>
      </main>

      <SessionDetailsDrawer sessionId={sessionId} knownTitle={knownTitle} onClose={sessionParam.close} />

      <CreateSessionDrawer
        key={createKey}
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onRefreshList={() => {
          setListCheckRequested(true)
          setRefreshKey((k) => k + 1)
        }}
      />
    </>
  )
}
