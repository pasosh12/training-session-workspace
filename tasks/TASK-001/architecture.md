# TASK-001 Architecture

Status: decisions recorded. The developer approved the items in §10 (P-1 to P-7) as recommended.
Inputs: `tasks/TASK-001/requirements.md`, `frontend-accelerator-assessment/{FRONTEND_ASSESSMENT_SPEC,API_CONTRACT,MOCKING_GUIDE}.md`, repository config (`package.json`, `vite.config.ts`, `tsconfig.app.json`, `src/test/setup.ts`, `src/main.tsx`).
Rulesets applied: `rulesets/common/architect/rules/{frontend-boundaries,state-and-failure-flow}.md`, `rulesets/framework/architect/INDEX.md` (state-lift, decouple-state, context-interface, React 19 refs). There is no project architect ruleset.
External docs: not consulted. No decision depends on the API of a newly added library. The MSW items in §8 rely on existing knowledge of `msw@2` and are flagged as risks to confirm during implementation.

Out of scope here: scenario selection mechanism, client error model, and MSW worker/server setup details (OQ-3, `api-integration`); layout, create placement, status visuals, and success/reset UX (OQ-4, `ui-designer`).

## Starting Point (repository evidence)

- Single Vite + React 19 app at the repository root. `src/` contains only the Vite starter (`App.tsx`, `App.css`, assets, `App.test.tsx`).
- No router, no data library, no existing module conventions to preserve.
- Vitest (`jsdom`, globals, `src/test/setup.ts`), Testing Library, user-event, oxlint, and `tsc -b` are already configured.
- `msw@2.14.6` is installed (in `dependencies`). `public/mockServiceWorker.js` does not exist yet.

---

## AD-1. Routing and details view (OQ-1)

**Decision:** No router dependency. The app has one workspace view. Session details open in an overlay (drawer or modal; `ui-designer` chooses which) on top of the list, which stays mounted. The open session is stored in the URL as a search parameter, `?session=<id>`, through a small hook (`useUrlParam`) built on `history.pushState`/`replaceState` and `popstate`.

- Opening a session calls `pushState(?session=id)`. Closing calls `history.back()` when the entry was pushed in this session; otherwise (the user arrived through a deep link) it calls `replaceState` without the param. Back and forward open and close details.
- **Other query parameters are preserved.** `useUrlParam` reads and writes through `URLSearchParams` built from the current `location.search`, and changes only the `session` key: set it on open, delete it on close. Every other parameter (for example a future `?scenario=` read by the mock layer) and the pathname and hash are carried over unchanged on each `pushState` and `replaceState`. The hook never rebuilds the URL from scratch and never drops parameters it doesn't own.
- **Open or closed is derived only from the URL.** The overlay's visibility is computed as `const openId = useUrlParam('session'); const isOpen = openId !== null`. No separate `isOpen` state exists anywhere.
  - Every close path calls the same `closeDetails()`, which only changes the URL: the close button, Escape, a backdrop click, and the native `<dialog>` `cancel` and `close` events if a native dialog is used.
  - The overlay closes only because the derived value becomes `null`.
  - When a native `<dialog>` is used, its `cancel` event is `preventDefault()`-ed and routed to `closeDetails()`, and a stray `close` event also routes to `closeDetails()`. An effect keeps `showModal()` or `close()` in step with `isOpen`, so the element's own open attribute follows the URL and never leads it.
  - Back and forward work the same way: `popstate` updates the hook's value, and the overlay follows.
  - As a result, no interaction can leave the URL saying "open" while the UI is closed, or the reverse.
- On a direct load of `/?session=ses_101`, the list renders and the details overlay opens for that id (deep link, AC-D5).
- List context (AC-L7, AC-D6) is preserved by construction: the list component never unmounts, so its filter state, fetched data, and scroll position survive. Focus return to the triggering row is a UI responsibility (AC-D4).

**Rationale:** The requirements have one view plus details. A router would add a dependency (which needs a recorded reason and trade-off under the spec constraints) to solve about 40 lines of reversible local logic. Keeping the list mounted removes the main reason to persist list state elsewhere.

**Rejected:**
- `react-router` with a `/sessions/:id` route: real deep links and nested layouts, but it adds a dependency, requires restoring list state across route changes (or a layout route), and needs a SPA fallback for `vite preview`. It is reasonable if more views are planned, and it is available as an alternative in §10.
- Details as internal state only (no URL): simplest, but loses deep linking and Back-button behavior.

**Risk:** a hand-rolled history hook must handle `popstate` correctly and avoid duplicate pushes. It is covered by one behavior test (open → Back closes).

## AD-2. Filter state ownership

**Decision:** The search text and status filter are transient UI state owned by `SessionsWorkspace` (`useState`) and passed down to the filter bar and list query. They are not stored in the URL (filter URL sync is an optional extension and is deferred).

- The search input is controlled. The value sent to the server is a **debounced** copy of the input (about 300 ms). Changing the status triggers a request immediately. "Clear all" resets both and requests immediately.
- The debounced value is derived inside a `useDebouncedValue` hook, so there is no second copy of the filter state.

**Rationale:** There is one owner, the lifecycle matches (it lives as long as the workspace), and AD-1 already preserves it across opening details. Moving it to the URL later is a local change confined to `SessionsWorkspace`.

**Rejected:** a global store or Context for filters, which would be a global abstraction with one caller.

## AD-3. Server-state ownership (OQ-2)

**Decision:** No data-fetching library. Remote data is owned by three feature hooks that call the API client:

| Hook | Owner component | Key | Notes |
| --- | --- | --- | --- |
| `useSessionsList({ query, status }, refreshKey)` | `SessionsWorkspace` | filters + refresh key | Keeps the previous `data` while a new request is in flight (`isRefreshing`) so filter changes never flash the empty state (AC-S9). |
| `useSessionDetails(sessionId)` | details overlay | session id | Runs only while the overlay is open; `retry()`. |
| `useCoaches()` | create form | — | Fetched when the form mounts; `retry()`. |

The shared request state is a discriminated union: `{ status: 'loading' } | { status: 'success', data, isRefreshing } | { status: 'error', error, retry }`. Each hook:

- creates an `AbortController` per request and aborts on key change or unmount, so stale responses can never overwrite newer ones;
- ignores `AbortError`;
- exposes `retry` / `refresh`.

A tiny generic `useAsyncResource(fetcher, deps)` may back all three when the plan finds it removes duplication. Each of the three hooks still owns its own data, and there is no shared cache.

The create mutation is `useCreateSession()`, owned by the create form. Its state is `idle | pending | success(session) | error(ApiError)`. A synchronous in-flight ref guard plus a disabled submit control prevent duplicate POSTs (AC-C5). There is no retry-on-failure loop and no idempotency key.

**Rationale:** three reads with no cross-view caching, one mutation, and a refetch-after-create rule that fits in a few lines. The spec explicitly warns against adding a data library only because of React conventions. Each piece of remote data has exactly one owner, so there is no duplicated source of truth (AC-M8).

**Rejected:**
- TanStack Query: well-tested caching, deduplication, and invalidation, but a new dependency whose main benefits (a shared cache across views, background refresh) are optional extensions here. Available as an alternative in §10.
- React 19 `use()` with Suspense for reads: elegant for the initial load, but awkward for keep-previous-data while filtering and for retry. It also hides the explicit loading and error states the assessment needs to observe.

## AD-4. Refetch after create, and discoverability

**Decision:**

1. On `201`, the form reports the created `SessionDetails` to `SessionsWorkspace` through a callback (`onCreated(session)`).
2. `SessionsWorkspace` increments its `refreshKey`, so the list refetches **with the current filters**. There is no optimistic insert and no client-side merging of the created record into the list.
3. Discoverability is decided from the server: once that refetch succeeds, the workspace checks whether `created.id` is in the returned `data`.
   - Present: the success feedback offers "Open session".
   - Absent (active filters hide it): the success feedback offers "Open session" (allowed, because details are loaded by id) and "Reset filters".
4. "Open session" sets `?session=<id>` (AD-1). "Reset filters" clears the filter state (AD-2), which triggers a refetch.

The workspace stores `lastCreated: { id, title } | null` only to drive this feedback. It is not a second copy of the list.

**Rationale:** the server is the only source of filter semantics (`MOCKING_GUIDE.md` forbids client-side filtering as the implementation). Checking membership in the refetched page avoids copying the matching rules into the client.

**Edge cases:** if the refetch fails, the success message still shows with "Open session", and the list shows its own error state with retry. A page size of 10 combined with more than 10 matches could push the new session off page 1. This is accepted for v1 because pagination is optional, and the workspace treats it the same as "filtered out".

## AD-5. Date handling

**Decision:**

- **Boundary:** the API client's response mappers (`src/api/mappers.ts`) parse every contract timestamp (`startsAt`, `createdAt`, `updatedAt`, `cancellation.cancelledAt`) into a `Date` and reject invalid values as a contract error. Domain models (`Session`, `SessionDetailsModel`) carry `Date` objects. DTO types (exact contract shapes with ISO strings) stay inside `src/api/`.
- **Display:** `src/lib/datetime.ts` provides formatters built on `Intl.DateTimeFormat` with no explicit `timeZone`, so values display in the user's local timezone and locale. The end time is derived (`startsAt + durationMinutes`), not stored.
- **Create:** the form keeps `date` (`YYYY-MM-DD`) and `time` (`HH:mm`) as strings. `toCreateSessionRequest()` combines them into a local `Date` with `new Date(y, m-1, d, h, min)` and sends `startsAt` as `date.toISOString()` (UTC). Validation that the start is in the future compares against an injected `now: () => Date` (default `Date.now`) at submit time, so tests stay deterministic. DST gaps (for example 02:30 on a spring-forward day) are normalized by `Date`; this is accepted.
- **Fixture rebasing** happens only in `src/mocks/` (AD-6). Production code never sees `referenceNow`.

**Rationale:** a single parse point (AC-M7). Presentation code formats `Date` objects and never parses strings.

**Rejected:** a date library (`date-fns`, `dayjs`), since `Intl` covers the formatting needs and adding one would require a recorded reason; keeping ISO strings in domain models and parsing in each component, which scatters parsing.

## AD-6. Mock boundary placement and bootstrap

This section decides only *where* the mock layer sits and *when* it starts. How a scenario is selected, how handlers apply scenarios, and how errors are shaped belong to `api-integration` (OQ-3).

**Decision:**

- All mock code lives in `src/mocks/` (handlers, in-memory session store, fixture loading, clock rebasing, scenario resolution). Fixture JSON is imported **only** from `src/mocks/`, directly from `frontend-accelerator-assessment/fixtures/` (read-only import; the assessment directory stays unchanged and there is no copy that could drift).
- `src/main.tsx` is the only production module that refers to mocks. It runs `await enableMocking()` (a dynamic `import('./mocks/browser')`, then `worker.start()`) **before** `createRoot().render()`, so the first `GET /api/sessions` is intercepted.
- Mocking is **on by default in every build mode** (no backend exists), and can be turned off with `VITE_API_MOCKING=off` for a future real backend. The `/api` base path comes from `VITE_API_BASE_URL`, defaulting to `/api`.
- Rebasing (`now − referenceNow`) is a pure function `rebaseFixtures(fixtures, now)` executed once when the mock store is created. The browser passes `new Date()` and tests pass a frozen instant.
- The in-memory store is created per worker or server start and reset between tests.

**Rationale:** keeps fixture and scenario knowledge out of `api/` and `features/` (AC-M5, AC-M6). With the dynamic import, removing mocks means deleting one directory and one bootstrap call.

## AD-7. Module boundaries and dependency direction

```text
src/
  main.tsx                 bootstrap: enableMocking() → render <App/>
  app/
    App.tsx                shell (h1, landmarks), error boundary, renders SessionsWorkspace
    ErrorBoundary.tsx      render-error containment; keeps the shell usable
  features/sessions/
    SessionsWorkspace.tsx  owns filters, refreshKey, lastCreated, open-session param
    list/                  filter bar, results (table/list per ui-design), states
    details/               overlay + useSessionDetails
    create/                form, validation (pure), useCoaches, useCreateSession
    hooks/                 useSessionsList (+ optional useAsyncResource)
    model.ts               feature-only types (SessionFilters, EMPTY_FILTERS, hasActiveFilters); may re-export domain types from api/types.ts
    status.ts              status → label/meaning (non-color text source)
  api/
    http.ts                single fetch wrapper: base URL, JSON, AbortSignal, error normalization
    sessions.ts            listSessions, getSession, createSession
    coaches.ts             listCoaches
    types.ts               domain types (Session, SessionDetailsModel, Coach, SessionsPage) with Date fields, plus the
                           domain unions and value lists (SessionStatus, SessionType, Visibility and their arrays)
    contract.ts            DTO types copied from API_CONTRACT.md (importable only by api/ and mocks/)
    mappers.ts             DTO ↔ domain (date parsing, request building)
  lib/
    datetime.ts            Intl formatters, local date+time → Date
    useUrlParam.ts         history-backed search param hook (AD-1)
    useDebouncedValue.ts
  mocks/
    browser.ts / node.ts   setupWorker / setupServer
    handlers.ts, store.ts, fixtures.ts, clock.ts, scenarios.ts
  test/
    setup.ts               jest-dom, MSW server lifecycle, clock freezing
    renderApp.tsx          test helper
```

Allowed imports (arrows point to the dependency):

- `app → features → api, lib`
- `features/*` may import `features/sessions/model.ts` and `status.ts`; subfolders don't import each other's internals except through what `SessionsWorkspace` passes down.
- `features → api/types.ts` (directly or through the re-exports in `features/sessions/model.ts`) for domain types and unions. **`features` never imports `api/contract.ts`.**
- Inside `api/`: `types.ts` may derive its unions and value lists from `contract.ts`. `mappers.ts`, `sessions.ts`, and `coaches.ts` import both. **`contract.ts` is imported only by `src/api/*` and `src/mocks/*`.**
- `api → lib` (datetime parsing only). `api` never imports `features`, `mocks`, or React.
- `mocks → api/contract.ts` (to share contract types) and the fixtures. **Nothing in `app`, `features`, `api`, or `lib` imports `mocks`**; only `main.tsx` and `test/` do.
- Components never call `fetch`; only `api/http.ts` does (AC-M6).

Form validation is a pure module (`create/validation.ts`, taking `now`) so it can be unit-tested and reused for mapping server `fieldErrors`.

The starter files (`App.css`, `src/assets/*`, starter content of `App.tsx` / `App.test.tsx`) are replaced. They are the scaffold placeholder, not unrelated code.

**Amendment 2026-11-04 (domain type location).** The `coder` stopped at plan step S1. The original tree put the domain types in `features/sessions/model.ts`, but `api/mappers.ts` and `api/sessions.ts` must return them, so `api` would have had to import `features`, which this section forbids. The developer chose this fix: the domain types (`Session`, `SessionDetailsModel`, `Coach`, `SessionsPage`) and the domain unions live in the new `src/api/types.ts`. `features/sessions/model.ts` keeps only feature types (`SessionFilters`, `EMPTY_FILTERS`, `hasActiveFilters`) and may re-export the domain types. `contract.ts` remains importable only by `api/` and `mocks/`. The dependency direction is unchanged (`app → features → api, lib`; `api` never imports `features`). Rejected: a type-only exception that would let `api` import from `features` (it weakens the rule for one convenience). Implementation implication: plan steps S1 and S3 put the domain types in `api/types.ts` instead of `features/sessions/model.ts`. No other decision changes.

## AD-8. Test stack

**Decision:** no new test dependencies.

- Vitest + jsdom + Testing Library + user-event (already configured). MSW `setupServer` from `msw/node` uses the **same handlers** as the browser and is wired in `src/test/setup.ts`: `listen({ onUnhandledRequest: 'error' })`, `resetHandlers()` plus a store reset after each test, `close()` after all.
- Tests render `<App/>` (or `SessionsWorkspace`) and assert behavior through roles and labels, covering AC-T1. Validation rules may also get pure unit tests.
- **Clock:** freeze only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(FIXED_NOW)`), so user-event, debounce, and MSW timers keep running. The mock store rebases against the same `FIXED_NOW`.
- **Latency:** mock latency (250 ms for `normal`) is configurable and set to 0 in tests, except for the initial-loading test, which asserts before the response resolves.
- **Absolute URLs:** `api/http.ts` resolves request URLs against `window.location.origin` (`new URL(path, origin)`), because Node's `fetch` rejects relative URLs. This also works in the browser and keeps handlers path-based.

**Risks to confirm during implementation:**
- The combination of `toFake: ['Date']`, user-event, and the debounce timer.
- JSON imports from outside `src/` under `tsconfig.app.json` (it has `include: ["src"]`). Bundler resolution may need `resolveJsonModule`, a `.d.ts`, or extending `include`. This is a configuration change the coder must record.

## AD-9. Failure containment

- **List, details, and coaches failures** are each handled inside their own region with retry (AC-S5–S7). One failing region never blanks the others (for example, a details failure leaves the list usable, and a coaches failure leaves the list and details usable).
- **Contract or mapping errors** (an invalid timestamp from the server) surface as that region's error state, not as a crash.
- **Render errors** are caught by `app/ErrorBoundary.tsx`, which keeps the `h1` shell and offers a reload.
- **Network failure** (fetch rejects) is normalized by `api/http.ts` into the same error type as an HTTP error. The exact shape is owned by `api-integration`.

## AD-10. Performance and security notes

- At most 10 rows per page, so no virtualization or memoization is needed. Debouncing plus aborting keeps typing cheap.
- No `dangerouslySetInnerHTML`. Description and notes render as text. No secrets; the MSW worker is the only service worker.

---

## 10. Items Requiring Developer Approval

**Approval record:** the developer approved P-1 through P-7 as recommended in the second `/architect` invocation of this task ("Approved: P-1 through P-7 as recommended."). The Recommendation column below is now the selected option for each item. No alternative was chosen.

| # | Item | Recommendation (approved) | Alternative (not selected) |
| --- | --- | --- | --- |
| P-1 | **No router dependency.** Details open in an overlay, with deep links via `?session=<id>` and a custom history hook (AD-1). | Approve | Add `react-router` (new dependency, recorded trade-off). The `/sessions/:id` route adds a SPA fallback concern. |
| P-2 | **No data-fetching library.** Hand-rolled hooks with abort and keep-previous (AD-3). | Approve | Add `@tanstack/react-query` (new dependency, recorded trade-off). |
| P-3 | **Mocks on in all build modes by default**, with `VITE_API_MOCKING=off` as the switch for a real backend (AD-6). | Approve | Mocks only in dev and test. `npm run preview` would then have no API. |
| P-4 | **Run `npx msw init public --save`.** Adds `public/mockServiceWorker.js` and a `msw.workerDirectory` entry to `package.json`. Required by `MOCKING_GUIDE.md`. | Approve | — |
| P-5 | **Possible TypeScript config change** so `src/mocks/` can import fixture JSON from `frontend-accelerator-assessment/` (AD-8 risk). The coder chooses the minimal change and records it. | Approve | Copy fixtures into `src/mocks/fixtures/`. This duplicates assessment data and can drift. |
| P-6 | **Replace the Vite starter** (`App.css`, `src/assets/*`, starter `App.tsx` and `App.test.tsx`) (AD-7). | Approve | Keep the files unused. |
| P-7 | **Defer optional extensions** (filter URL sync, type filter, pagination, cancellation, and the others). The architecture leaves room for URL filter sync as a local change. | Approve | Name the extensions to include. |

## Handoff Dependencies

- `api-integration` (OQ-3): how a scenario is selected, scenario application in handlers, `ApiError` / network error model in `api/http.ts`, handler validation rules, and the shape of the mock store API. It must fit AD-6 and AD-7.
- `ui-designer` (OQ-4): drawer vs. modal for AD-1, desktop and mobile representation, create placement and how it opens, status indicator, success and reset-filters feedback for AD-4, and live-region strategy.
- `writing-plans`: after the approvals above and the two specialist decisions.
