# TASK-001 API Integration

Status: frontend contract settled for planning. This resolves OQ-3 in `requirements.md`. No contract change is required. §9 lists clarifications that are interpretations of the contract, not changes.

Inputs: `frontend-accelerator-assessment/API_CONTRACT.md`, `MOCKING_GUIDE.md`, `fixtures/*` (read 2026-11-03), and `tasks/TASK-001/architecture.md` (AD-3, AD-5, AD-6, AD-7, AD-8, AD-9; approvals P-1 to P-7). Rulesets: `rulesets/common/api-integration/rules/{contract-evidence,client-behavior}.md`. There are no framework or project api-integration rules.

External docs: not consulted. The MSW 2 API names used below (`http`, `HttpResponse`, `delay`, `setupWorker`, `setupServer`, `HttpResponse.error()`) come from existing knowledge of `msw@2.x` and should be confirmed by the coder against the installed `msw@2.14.6` types.

Contract authority: the contract is **fixed** and owned by the assessment (evaluator). The MSW handlers are a mock of that contract. They are not backend truth, and nothing here is presented as implemented backend behavior.

---

## 1. Contract Classification

| Element | Classification | Notes |
| --- | --- | --- |
| `GET /api/sessions` with `query` and `status`, the `SessionsResponse` shape, `400 INVALID_FILTER`, `500 SESSIONS_UNAVAILABLE` | **Confirmed** (contract) | `page: 1` and `pageSize: 10` are always returned. |
| `GET /api/sessions/:sessionId` returning `SessionDetails`, `404 SESSION_NOT_FOUND`, `500 SESSION_DETAILS_UNAVAILABLE` | **Confirmed** | |
| `GET /api/coaches` returning `CoachesResponse`, `500 COACHES_UNAVAILABLE` | **Confirmed** | |
| `POST /api/sessions` with `CreateSessionRequest` returning `201 SessionDetails`, `400 VALIDATION_FAILED` (`fieldErrors`), `500 CREATE_SESSION_FAILED` | **Confirmed** | |
| `ApiError` envelope `{ error: { code, message, fieldErrors? } }` | **Confirmed** | |
| Sort order of the list | **Assumed** (§9 C-1) | The contract does not specify an order. |
| Which fields "location" search covers | **Assumed** (§9 C-2) | |
| What counts as a "malformed query parameter" | **Assumed** (§9 C-3) | |
| `fieldErrors` key names | **Assumed** (§9 C-4) | Keys are request field names. |
| How handlers validate create requests beyond `MOCKING_GUIDE.md` | **Assumed** (§9 C-5) | |
| `409 COACH_SCHEDULE_CONFLICT`, cancel endpoint, permissions, optional scenarios | **Out of scope** (P-7) | The client maps `409` generically if it ever appears. |
| Timeouts, retries, idempotency, caching headers | **Not in contract**, so not invented | No automatic retry, no client timeout, no idempotency key. |

---

## 2. Client Module (`src/api/`)

Only `src/api/http.ts` calls `fetch`. Components and hooks call the functions below (AD-7).

### 2.1 Public functions

```ts
// src/api/sessions.ts
listSessions(filters: { query?: string; status?: SessionStatus }, opts?: { signal?: AbortSignal })
  : Promise<SessionsPage>            // { items: Session[]; total: number; page: number; pageSize: number }
getSession(sessionId: string, opts?: { signal?: AbortSignal })
  : Promise<SessionDetailsModel>
createSession(request: CreateSessionRequest)
  : Promise<SessionDetailsModel>     // no signal; see 2.4

// src/api/coaches.ts
listCoaches(opts?: { signal?: AbortSignal }): Promise<Coach[]>

// src/api/mappers.ts (pure)
toCreateSessionRequest(values: CreateSessionFormValues): CreateSessionRequest
```

Request building:

- `listSessions` trims `query` and omits it when empty. It omits `status` when undefined. It never sends `type`, `page`, or `pageSize`. Parameters are encoded with `URLSearchParams`.
- `getSession` encodes the id with `encodeURIComponent`.
- `toCreateSessionRequest` (AD-5):
  - trims `title`, `locationName`, and `locationAddress`;
  - sends `description` and `trainerNotes` as `null` when they are empty after trimming;
  - converts `durationMinutes` and `capacity` with `Number()` (validation has already ensured they are integers);
  - builds `startsAt` from the local date and time, then `.toISOString()`.

  It sends exactly the `CreateSessionRequest` fields and nothing else.

### 2.2 Transport (`src/api/http.ts`)

```ts
request<T>(method: 'GET' | 'POST', path: string, init: {
  query?: URLSearchParams; body?: unknown; signal?: AbortSignal
}): Promise<unknown>  // parsed JSON; typed and validated by the caller's mapper
```

- The URL is `new URL(baseUrl + path, window.location.origin)`. `baseUrl` is `import.meta.env.VITE_API_BASE_URL ?? '/api'` (AD-6, AD-8).
- Headers: `Accept: application/json`, plus `Content-Type: application/json` when there is a body.
- The response is classified as described in 2.3. A successful response's body is returned as `unknown`, and the endpoint function passes it through a mapper that both validates and converts (2.5).

### 2.3 Normalized error type

```ts
// src/api/errors.ts
export type ApiFailure =
  | { kind: 'http';     status: number; code: string; message: string;
                        fieldErrors?: Record<string, string> }
  | { kind: 'network';  message: string }   // fetch rejected (offline, DNS, CORS, HttpResponse.error())
  | { kind: 'contract'; message: string };  // 2xx with unparseable/invalid body, invalid timestamp

export class ApiRequestError extends Error {
  readonly failure: ApiFailure
}
export function isAbortError(e: unknown): boolean   // DOMException name === 'AbortError'
```

The contract's `ApiError` interface is named `ApiErrorBody` in `src/api/contract.ts`, so the DTO and the thrown class can't be confused.

Classification rules, applied in this order:

| Situation | Result |
| --- | --- |
| `signal` aborted, so `fetch` or `json()` rejects with `AbortError` | The `AbortError` is **rethrown unchanged** and is not an `ApiFailure`. Hooks ignore it with `isAbortError` (AD-3). |
| `fetch` rejects for any other reason | `{ kind: 'network', message: 'Network request failed' }`. The raw error is not exposed. |
| Non-2xx with a JSON body matching `ApiErrorBody` | `{ kind: 'http', status, code, message, fieldErrors }`. `fieldErrors` is kept only if it is an object of string values. |
| Non-2xx without a valid envelope (HTML, empty, malformed) | `{ kind: 'http', status, code: 'HTTP_<status>', message: 'Unexpected server response' }` |
| 2xx whose body fails `json()` or the mapper's validation | `{ kind: 'contract', message }` (AD-9) |

The client does not retry automatically and has no client timeout. Recovery is always started by the user through `retry()` or by resubmitting.

**User-visible copy** is chosen in the features layer from `failure.kind` and `failure.code`, using the codes in §6, with the server `message` as a fallback for unknown codes. Network and contract failures get generic copy. Raw transport details never reach the UI. Exact wording belongs to `ui-designer`.

### 2.4 Cancellation and duplicate prevention

- **Reads:** each hook passes its own `AbortController.signal`, aborts on key change or unmount, and ignores `AbortError` (AD-3).
- **Create:** no `signal` is passed. Aborting a POST cannot undo a server-side effect, so pretending to cancel it would be misleading. Duplicate prevention is entirely client-side (AD-3 in-flight guard and disabled submit). No idempotency key is sent, because the contract provides none.

### 2.5 Response validation and mapping (`src/api/mappers.ts`)

No schema library (P-2 spirit; no new dependency). Hand-written guards check:

- required keys and primitive types;
- enum membership for `type`, `status`, and `visibility`;
- that integers are finite numbers;
- that every timestamp parses to a valid `Date` (`startsAt`, `createdAt`, `updatedAt`, `cancellation.cancelledAt`).

Any failure throws `ApiRequestError({ kind: 'contract' })`.

The mappers convert:

- `SessionSummary` → `Session`: dates become `Date`. `endsAt` is not stored; it is derived in `lib/datetime`.
- `SessionDetails` → `SessionDetailsModel`: adds `description`, `trainerNotes`, `createdAt`, and `cancellation`. Null fields stay `null`.
- `SessionsResponse` → `SessionsPage`.
- `CoachesResponse` → `Coach[]`.

### 2.6 Mapping `fieldErrors` to form controls (AC-C4)

| Server key (`CreateSessionRequest` field) | Form control(s) |
| --- | --- |
| `title`, `type`, `visibility`, `capacity`, `locationName`, `locationAddress`, `description`, `trainerNotes` | the control of the same name |
| `durationMinutes` | duration |
| `coachId` | coach |
| `startsAt` | date **and** time (message shown once, under the date and time group) |
| any other key | shown as a form-level error |

If a `400` response has no `fieldErrors`, `failure.message` is shown as a form-level error.

---

## 3. Mock Scenario Selection (OQ-3)

### 3.1 Mechanism

- The scenario is chosen by the **page URL query parameter `?scenario=<name>`**, for example `http://localhost:5173/?scenario=list-error`.
- It is **read once at mock startup** inside `src/mocks/browser.ts` (`resolveScenario(window.location.search)`) and stored in the mock module's state. Handlers read that module state. They never read `window.location`.
- The value is checked against the six required names. An absent, unknown, or optional-only name (for example `create-conflict`) falls back to `normal` and logs `console.warn('[mocks] unknown or unsupported scenario "<x>", using "normal"')`.
- On every start, the active scenario is logged with `console.info('[mocks] scenario: <name>')`. This leaves a record for browser verification.
- To switch scenarios, the user navigates to a new URL (a full reload). Scenario changes inside the page are deliberately not supported, so every scenario starts from a fresh, deterministic store.

### 3.2 Survives opening and closing details

- Because the scenario is fixed at startup, opening and closing details (`pushState`/`replaceState`/`popstate` on `?session=`) can't change it, even if the URL were altered.
- AD-1 additionally requires `useUrlParam` to preserve every other query parameter, so `?scenario=list-error&session=ses_101` keeps `scenario` in the address bar. A reload or a copied deep link therefore reproduces the same scenario.
- Combined deep link example: `/?scenario=details-error&session=ses_101` opens straight into the details failure.

### 3.3 Never reaches presentation code

- Scenario names, `resolveScenario`, and the fixture JSON exist only under `src/mocks/`.
- `src/main.tsx` calls `enableMocking()` and knows nothing about scenarios.
- `app/`, `features/`, `api/`, and `lib/` neither import `src/mocks/` nor read `scenario` (AD-7). `useUrlParam` treats `scenario` as an opaque parameter it doesn't own.
- Presentation code only ever sees ordinary success results or an `ApiRequestError`.
- Code review check: `grep -rn "scenario\|fixtures" src/app src/features src/api src/lib` must return nothing.

### 3.4 Tests

The node server doesn't use the URL. `src/mocks/controls.ts` exports test-only controls:

```ts
resetMockState(opts: { now: Date; scenario?: ScenarioName; latencyMs?: number }): void
```

This rebuilds the store from rebased fixtures, sets the scenario, and sets the latency. The browser bootstrap calls the same function with `{ now: new Date(), scenario: resolved, latencyMs: undefined }`, where `undefined` means the scenario default. Only `src/test/**` and `src/mocks/browser.ts` import `controls.ts`.

---

## 4. Required Scenarios: Behavior per Endpoint

Error bodies are returned **verbatim** from `fixtures/mock-scenarios.json`, so the fixture file is the single source for each scenario's status and body. The latency for every scenario is `normal.defaultLatencyMs` (250 ms) in the browser and 0 by default in tests.

| Scenario | `GET /api/sessions` | `GET /api/sessions/:id` | `GET /api/coaches` | `POST /api/sessions` |
| --- | --- | --- | --- | --- |
| `normal` | Store data filtered by `query`/`status` | Store details or `404` | Coaches fixture | Validate, then `201` and persist |
| `empty` | The store is **seeded with zero sessions**, so the response equals the scenario body (`data: []`, `total: 0`) until something is created | `404 SESSION_NOT_FOUND` for every fixture id (nothing exists); created sessions resolve | Coaches fixture | Same as `normal`. The created session then appears in the list. |
| `list-error` | **`500 SESSIONS_UNAVAILABLE`** on every call, including retries | Same as `normal` (deep links still work) | Same as `normal` | Same as `normal`. The refetch after create still fails (AD-4 edge case). |
| `details-error` | Same as `normal` | **`500 SESSION_DETAILS_UNAVAILABLE` for `ses_101` only**, on every call. Other ids follow `normal`. | Same as `normal` | Same as `normal` |
| `coaches-error` | Same as `normal` | Same as `normal` | **`500 COACHES_UNAVAILABLE`** on every call | Same as `normal` (the UI blocks submission, AC-C9) |
| `create-error` | Same as `normal` | Same as `normal` | Same as `normal` | **`500 CREATE_SESSION_FAILED` for every POST**, returned before validation. The store is unchanged. |

Notes:

- `empty` is implemented as an empty seed, not as a fixed response override. Otherwise stateful create would be invisible in that scenario. The first list response is still byte-for-byte equal to the scenario's `body`.
- A `404` for an unknown id is ordinary `normal` behavior (the store has no such record). It does not require the optional `unknown-session` scenario.
- Failures are persistent within a scenario. Retry produces the same failure, which is deterministic and keeps the retry path observable. Recovery is demonstrated by switching to `normal`.

---

## 5. Handlers and In-Memory Store (`src/mocks/`)

### 5.1 Store and fixture clock

- `fixtures.ts` imports `sessions.json`, `coaches.json`, `mock-scenarios.json`, and `fixture-clock.json` from `frontend-accelerator-assessment/fixtures/`, plus the details via `import.meta.glob('…/session-details/*.json', { eager: true })` (P-5).
- `clock.ts`: `rebaseFixtures(fixtures, now)` computes `offsetMs = now − Date.parse(referenceNow)` and shifts every field listed in `fixture-clock.json#timestampFields` (`startsAt`, `createdAt`, `updatedAt`, `cancelledAt`, including nested `cancellation.cancelledAt`). Output is a `toISOString()` string. It is pure and the inputs are not mutated.
- `store.ts`: `Map<string, SessionDetails>`, keyed by id, in insertion order (fixture order, then created sessions). List summaries are **derived** from the details records by dropping the details-only fields, so the list and details can never disagree.
- Coaches are read-only, taken from the fixture.
- **Recommended test clock:** `FIXED_NOW = referenceNow` (`2026-07-27T12:00:00Z`). The offset is then 0 and test data equals the fixture files.

### 5.2 `GET /api/sessions`

1. Validate parameters (§9 C-3).
   - `status` present and not in `scheduled | full | cancelled | completed` → `400 INVALID_FILTER`.
   - `query` or `status` given more than once → `400 INVALID_FILTER`.
   - Unknown parameters (`type`, `page`, …) are ignored.
2. `q = query.trim().toLowerCase()`. If `q` is non-empty, keep records where `title`, `coach.name`, `location.name`, or `location.address` contains `q` after lowercasing (§9 C-2).
3. Apply the exact `status` match.
4. `total = filtered.length`. `data = filtered.slice(0, 10)`. `meta = { page: 1, pageSize: 10, total }`.

The handler does all the filtering. The client never filters (AC-M2).

### 5.3 `GET /api/sessions/:sessionId`

Returns the record from the store, or `404 { error: { code: 'SESSION_NOT_FOUND', message: 'The requested session no longer exists.' } }`. The message is reused from the `unknown-session` fixture so the copy stays consistent.

### 5.4 `GET /api/coaches`

Returns `{ data: coaches }`.

### 5.5 `POST /api/sessions`: validation and create

Validation follows `MOCKING_GUIDE.md` and the contract types (§9 C-5). All failures are collected and returned as one `400 { error: { code: 'VALIDATION_FAILED', message: 'Some fields need attention.', fieldErrors } }`. A body that isn't JSON returns `400 VALIDATION_FAILED` with no `fieldErrors`.

| Field | Rule (handler) |
| --- | --- |
| `title`, `locationName`, `locationAddress` | string, non-empty after trimming |
| `type` | one of `training`, `camp`, `private` |
| `visibility` | one of `public`, `invite-only` |
| `startsAt` | string that `Date.parse` accepts **and** ISO 8601 form (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z\|[+-]\d{2}:\d{2})$/`) |
| `durationMinutes`, `capacity` | positive integer |
| `coachId` | string matching an id in `coaches.json` |
| `description`, `trainerNotes` | absent, `null`, or string |

The product rules (lengths, 30–240, 1–100, future start, 500-character notes) are enforced by the **client** (AC-C2). The mock does not copy them, because they aren't contract rules (C-5).

On success, the handler builds `SessionDetails`:

- `id`: `ses_new_<n>`, where `n` is a counter that resets with the store;
- the trimmed strings from the request;
- `description` and `trainerNotes`: trimmed, and `null` when empty or absent;
- `status: 'scheduled'`, `bookedCount: 0`;
- `coach`: the full `CoachSummary` from `coaches.json`;
- `location: { name, address }`;
- `createdAt` and `updatedAt`: the store clock's "now";
- `cancellation: null`.

It stores the record and returns `201` with it. Later list and details reads include the new session (AC-M3).

### 5.6 Latency

`await delay(latencyMs)` runs at the start of every handler, before the scenario override, so loading and pending states are visible in the browser (AC-S1, AC-C5).

---

## 6. State and Error Matrix

`Hook state` refers to the AD-3 union. Copy and visuals are owned by `ui-designer`.

### 6.1 `GET /api/sessions` (`useSessionsList`, owned by `SessionsWorkspace`)

| Condition | Client result | UI state | AC |
| --- | --- | --- | --- |
| First request in flight | — | `loading`, no previous data, loading indicator | AC-S1 |
| `200`, `total > 0` | `SessionsPage` | populated list, result count | AC-S2, AC-L2, AC-L8 |
| `200`, `total = 0`, no active filters | `SessionsPage` (empty) | "no sessions yet" plus a create action | AC-S3 |
| `200`, `total = 0`, filters active | `SessionsPage` (empty) | "no matches" plus clear filters | AC-S4, AC-L5 |
| Filter change in flight | — | `success` with `isRefreshing: true`, previous rows kept | AC-S9, AC-L3, AC-L4 |
| `500 SESSIONS_UNAVAILABLE` | `http` | list-region error plus retry. Filters stay usable. | AC-S5 |
| `400 INVALID_FILTER` | `http` | list-region error plus clear filters (not reachable from the UI, A4) | AC-M2 |
| Network failure | `network` | list-region error plus retry | AC-S5, AD-9 |
| Invalid body or timestamp | `contract` | list-region error plus retry | AD-9 |
| Superseded or unmounted | `AbortError` | ignored | AD-3 |
| Refetch after create succeeds or fails | as above | AD-4 discoverability feedback | AC-C7, AC-C8 |

### 6.2 `GET /api/sessions/:id` (`useSessionDetails`, owned by the details overlay)

| Condition | Client result | UI state | AC |
| --- | --- | --- | --- |
| In flight | — | overlay open with a loading state (heading present) | AC-D4 |
| `200` | `SessionDetailsModel` | full details, "none" for null fields, cancellation block when present | AC-D1, AC-D2, AC-D3 |
| `500 SESSION_DETAILS_UNAVAILABLE` (`details-error`, `ses_101`) | `http` | in-overlay error, retry, and close back to the list | AC-D7, AC-S6 |
| `404 SESSION_NOT_FOUND` (deep link to an unknown id, any id under `empty`) | `http` | "session not found" and close back to the list (no retry) | AC-D7, AC-D5 |
| Network or contract failure | `network` / `contract` | in-overlay error plus retry | AD-9 |
| Closed while in flight | `AbortError` | ignored | AD-3 |

### 6.3 `GET /api/coaches` (`useCoaches`, owned by the create form)

| Condition | Client result | UI state | AC |
| --- | --- | --- | --- |
| In flight | — | coach control disabled with a loading label. Submit disabled. | AC-C9 |
| `200` | `Coach[]` | coach options | AC-C1 |
| `500 COACHES_UNAVAILABLE` (`coaches-error`) | `http` | inline error at the coach control plus retry. **Submit disabled.** Other entered values kept. | AC-C9, AC-S7 |
| Network or contract failure | `network` / `contract` | same as `500` | AC-C9 |

### 6.4 `POST /api/sessions` (`useCreateSession`, owned by the create form)

| Condition | Client result | UI state | AC |
| --- | --- | --- | --- |
| Client validation fails | no request | field errors, focus on the first invalid field | AC-C2, AC-C3 |
| In flight | — | `pending`, submit disabled, the in-flight guard blocks a second POST | AC-C5, AC-S8 |
| `201` | `SessionDetailsModel` | announced success, `onCreated`, then refresh and discoverability actions | AC-C7, AC-C8, AC-S8 |
| `400 VALIDATION_FAILED` with `fieldErrors` | `http` | errors mapped per 2.6, values kept | AC-C4, AC-S8 |
| `400` without `fieldErrors` | `http` | form-level error, values kept | AC-C4 |
| `500 CREATE_SESSION_FAILED` (`create-error`) | `http` | form-level error with a retry hint, **all values kept**, submit enabled again | AC-C6, AC-S8 |
| Network or contract failure | `network` / `contract` | same as `500`. The copy notes that the outcome is uncertain ("check the list before retrying"), because the request may have reached the server. | AC-C6 |
| Any other non-2xx (for example `409`) | `http` | form-level error using the server `message`, values kept | AC-C6 |

---

## 7. Browser Worker vs. Node Server

| | Browser (`src/mocks/browser.ts`) | Node / tests (`src/mocks/node.ts`) |
| --- | --- | --- |
| Setup | `setupWorker(...handlers)` | `setupServer(...handlers)` |
| Handlers | the same `handlers.ts` array | the same `handlers.ts` array |
| Start | `enableMocking()` in `main.tsx` awaits `worker.start({ serviceWorker: { url: \`${import.meta.env.BASE_URL}mockServiceWorker.js\` }, onUnhandledRequest })` before render. It is skipped when `VITE_API_MOCKING === 'off'` (P-3). | `src/test/setup.ts`: `beforeAll(server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(server.resetHandlers())`, `afterAll(server.close())` |
| Unhandled requests | `/api/*` → `console.error`; everything else (Vite modules, assets) is bypassed silently | any unhandled request fails the test |
| State reset | once at startup: `resetMockState({ now: new Date(), scenario })` | `beforeEach(resetMockState({ now: FIXED_NOW, scenario: 'normal', latencyMs: 0 }))`. A test can call `resetMockState({ …, scenario: 'empty' })` before rendering. |
| Scenario | `?scenario=` read at startup (§3) | `resetMockState` argument |
| Clock | real `new Date()` | `vi.useFakeTimers({ toFake: ['Date'] })` plus `vi.setSystemTime(FIXED_NOW)` (AD-8). MSW `delay` uses `setTimeout`, which isn't faked. |
| Worker file | `public/mockServiceWorker.js` from `npx msw init public --save` (P-4) | not used |
| URL resolution | `new URL(path, location.origin)` (2.2) | jsdom `location.origin` (`http://localhost:3000`). The handlers' relative paths match. |

One-off cases in tests (for example a network failure or a delayed response) use `server.use(http.get('*/api/sessions', () => HttpResponse.error()))` inside the test. They don't add a new scenario.

---

## 8. Test Strategy (integration slice)

These go into the coder's four to six tests (AC-T1). All run against the node server with the real handlers.

1. **Search plus status:** type a query, change the status, and assert the rows rendered from the filtered response. Optionally assert the request URL with a `server.events` listener, which shows the filtering happened in the handler. (AC-L3, AC-L4)
2. **Initial loading:** assert the loading indicator right after render, before `findBy` resolves the rows. (AC-S1)
3. **Empty and no matches:** `scenario: 'empty'` gives the "no sessions" message; under `normal`, the query `zzz` gives the different "no matches" message plus clear filters. (AC-S3, AC-S4)
4. **Create validation and success:** submit an invalid form and assert the field errors with no POST; then submit a valid form and assert the success announcement and the new row after the refetch. (AC-C2, AC-C7)
5. **Create server failure:** `scenario: 'create-error'`; values are preserved and a form-level error is shown. (AC-C6)
6. **List error:** `scenario: 'list-error'` shows the error and retry. (AC-S5)

Optional pure unit tests (not counted among the four to six): `rebaseFixtures`, `toCreateSessionRequest` (local → UTC), and handler validation (`400` with `fieldErrors`), which covers AC-C4 without bypassing client validation in the UI.

---

## 9. Contract Clarifications and Proposals

### Contract change proposals

**None.** Every required behavior can be built on the contract as written. Nothing in the endpoints, fields, statuses, or error codes is altered.

### Clarifications (interpretations; no contract change; for the evaluator's awareness)

| ID | Gap in the contract | Interpretation used by the mock | Who confirms |
| --- | --- | --- | --- |
| C-1 | List order is unspecified | Store insertion order: fixture order, then created sessions | evaluator / contract owner |
| C-2 | "Searches … location" doesn't say name or address | Case-insensitive substring over `location.name` **and** `location.address` | evaluator / contract owner |
| C-3 | "Malformed query parameter" is undefined | Unsupported `status` value, or `query`/`status` repeated. Unknown parameters are ignored. | evaluator / contract owner |
| C-4 | `fieldErrors` keys are undefined | `CreateSessionRequest` field names | evaluator / contract owner |
| C-5 | Server validation depth | The handler follows the `MOCKING_GUIDE.md` checks. Product ranges are client-only. A real backend may enforce more, and §2.6 maps any such `fieldErrors` generically. | evaluator / contract owner |
| C-6 | Generated id and timestamp format | `ses_new_<n>`; `createdAt = updatedAt` = mock clock now (ISO UTC) | evaluator / contract owner |

None of these is promoted to `specs/api-integration.md`. Living specs are updated only from confirmed and implemented truth after verification.

## 10. Handoff

- `ui-designer` (OQ-4): copy for each `ApiFailure` kind and code in §6, how the in-overlay error and not-found states are presented, the coaches-failure presentation at the coach control, and the uncertain-outcome wording for network failures on create.
- `writing-plans`: §2 to §8 define the files, functions, and tests for `src/api/`, `src/mocks/`, and `src/test/setup.ts`.
