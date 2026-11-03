# TASK-001 Requirements: Training Sessions Workspace

Status: ready for planning (two open questions below need decisions from specialists; none needs the developer to clarify the product)

Source of truth: `frontend-accelerator-assessment/FRONTEND_ASSESSMENT_SPEC.md`, with `API_CONTRACT.md`, `MOCKING_GUIDE.md`, `EVIDENCE_PROTOCOL.md`, `designs/DESIGN_TOKENS.md`, `designs/sessions-dashboard-reference.svg`, and `fixtures/`. This document restates those sources as verifiable criteria and does not override them. If this document and a source disagree, the source wins.

## 1. Goal

A training-business operator (a busy basketball trainer with several coaches and locations) needs one workspace to **find, inspect, and create** scheduled training sessions. The workspace should favor fast scanning and predictable actions. It must run entirely in the frontend against an MSW 2.14.6 mock of the fixed API contract, behind a client boundary that a real backend can replace.

## 2. Users and Problem

- **Primary user:** a trainer or operator who repeatedly scans schedules, resolves capacity questions, and creates sessions.
- **Problem:** scheduling information is currently split across a calendar, spreadsheets, and chat. The user needs visibility into scheduled, full, cancelled, and recently completed sessions in one place.
- **Desired outcome:** the user can locate a session, check its capacity and details, and create a new session, then confirm that it exists, without leaving the workspace or losing context.

## 3. Facts Established From the Repository

- F1. App root is the repository root (only frontend candidate). Stack: React `^19.3.1`, TypeScript `~7.0.2` (satisfies ≥5.9), Vite `^8.3.5` (satisfies ≥7), npm, Vitest 5 + Testing Library + jsdom, oxlint. `msw` `2.14.6` is in `dependencies`.
- F2. `src/App.tsx` is still the Vite starter template. No production feature code exists.
- F3. No router library is installed. `public/` contains no `mockServiceWorker.js` (the `npx msw init public --save` step from `MOCKING_GUIDE.md` has not been run).
- F4. The fixtures have five sessions covering all four statuses: `ses_101` scheduled, `ses_102` full, `ses_103` scheduled, `ses_104` cancelled, `ses_105` completed (in the past relative to `referenceNow`). Each has a details fixture. There are three coaches (`coach_01`–`coach_03`). `referenceNow` = `2026-07-27T12:00:00Z`.
- F5. Required mock scenarios: `normal`, `empty`, `list-error`, `details-error` (targets `ses_101`), `coaches-error`, `create-error`. `normal` declares `defaultLatencyMs: 250`.

## 4. Acceptance Criteria

Each criterion should be checkable with an automated test, a browser observation, or code inspection. **[T]** marks criteria that the spec names as minimum automated test coverage.

### 4.1 Sessions Workspace (list)

- AC-L1. A navigable sessions view exists and is the app's entry view.
- AC-L2. Each session shows: title, type, status, start time (local timezone), duration, coach name, location, capacity, and booked count.
- AC-L3. A search input sends `query` to `GET /api/sessions`. The handler matches title, coach name, or location case-insensitively. Results come from the server response, not from client-side filtering of the full list. **[T]**
- AC-L4. A single-status filter (`scheduled` / `full` / `cancelled` / `completed` / any) sends `status` to `GET /api/sessions`. **[T]**
- AC-L5. A "clear all filters" action resets search and status and reloads the unfiltered list. It is available whenever any filter is active.
- AC-L6. Every status is identifiable without color: each status indicator includes a text label (and may add an icon or shape).
- AC-L7. Opening a session and then returning preserves the list context: search text, status filter, and scroll position (or at least the position of the opened row).
- AC-L8. `meta.total` from the filtered response is shown or used consistently, for example as a result count.

### 4.2 Session Details

- AC-D1. Details show all list fields plus: description, trainer notes, capacity summary (for example booked/capacity and remaining spots), coach contact summary (name and email), and created and last-updated timestamps in the local timezone.
- AC-D2. Null `description` or `trainerNotes` renders a clear "none" state, not a blank space or the literal `null`.
- AC-D3. If `cancellation` is present, the details show the cancellation reason (or that none was given) and the cancellation time.
- AC-D4. Details can be opened and closed using only the keyboard. In a drawer or modal, focus moves into the details on open, is trapped or managed while open, and returns to the triggering row on close. Escape closes a drawer or modal.
- AC-D5. Details can be deep-linked if the chosen routing approach allows it. Loading a details URL directly shows that session. See OQ-1.
- AC-D6. Closing details returns to the previous list state (AC-L7).
- AC-D7. A details request failure shows a useful error with a retry action and a way back to the list (scenario `details-error`, session `ses_101`). A `404 SESSION_NOT_FOUND` response shows a "session not found" message.

### 4.3 Create Session

- AC-C1. The form has controls for: title, session type (`training`/`camp`/`private`), date, start time, duration (minutes), coach (from `GET /api/coaches`), location name, location address, capacity, visibility (`public`/`invite-only`), and optional description and trainer notes.
- AC-C2. Client-side validation, applied before any request is sent: **[T]**
  - title: 3–80 characters after trimming;
  - date and time: together they must resolve to a start in the future, in the user's local timezone. The submitted `startsAt` is that local instant converted to an ISO 8601 UTC string;
  - duration: integer from 30 to 240;
  - capacity: integer from 1 to 100;
  - coach: required, and must be one of the loaded coaches;
  - location name: 2–80 characters after trimming;
  - location address: 3–120 characters after trimming;
  - trainer notes: at most 500 characters.
- AC-C3. Each field error is shown next to its control and is associated with it programmatically (`aria-describedby` / `aria-invalid`). On a failed submit, focus moves to the first invalid field or to an error summary.
- AC-C4. A `400 VALIDATION_FAILED` response maps its `fieldErrors` onto the matching controls, and any message that doesn't belong to a field is shown as a form-level error.
- AC-C5. While a submission is pending, the submit control is disabled (or repeat submits are ignored) and a pending state is shown. Only one `POST` is sent per user intent. The client does not claim idempotency.
- AC-C6. On a server failure (`500 CREATE_SESSION_FAILED`, scenario `create-error`), a useful form-level error appears, every entered value is preserved, and the user can retry. **[T]**
- AC-C7. On success (`201`), the user sees a clear, announced confirmation. The new session appears in the list and its details can be opened. **[T]**
- AC-C8. If active search or status filters would hide the new session, the confirmation offers a clear action to open the new session and/or reset the filters that hide it.
- AC-C9. If coaches fail to load (`coaches-error`), the form says so, offers a retry, and does not allow a submission that would claim a valid coach selection.
- AC-C10. Submitted text values are trimmed. Empty optional description or notes are sent as `null` or left out.

### 4.4 Required UI States (each must be observable in the browser and testable)

| ID | State | Trigger | Expectation |
| --- | --- | --- | --- |
| AC-S1 | Initial loading | first list request in flight | loading indicator that is announced or labelled **[T]** |
| AC-S2 | Populated | `normal` | list from AC-L2 |
| AC-S3 | No sessions exist | `empty` | message saying no sessions exist yet, plus a create action **[T]** |
| AC-S4 | Filters match nothing | search/status with zero results | a message that differs from AC-S3, plus a clear-filters action **[T]** |
| AC-S5 | List request fails | `list-error` | useful error and a retry action **[T, either S5 or D7]** |
| AC-S6 | Details request fails | `details-error` | AC-D7 |
| AC-S7 | Coaches request fails | `coaches-error` | AC-C9 |
| AC-S8 | Create pending / success / validation failure / server failure | form actions, `create-error` | AC-C5, AC-C7, AC-C3/C4, AC-C6 |

- AC-S9. When a list refetch is triggered by changing a filter, the UI makes it clear that the results are updating. It must not flash the "no sessions" state while the request is in flight.

### 4.5 Mock and API Boundary

- AC-M1. MSW 2.14.6 handlers implement `GET /api/sessions`, `GET /api/sessions/:sessionId`, `GET /api/coaches`, and `POST /api/sessions` exactly as `API_CONTRACT.md` specifies (paths, fields, status codes, error codes).
- AC-M2. The list handler applies `query` and `status` before computing `meta.total`, and always returns `page: 1, pageSize: 10`. A malformed `status` returns `400 INVALID_FILTER`.
- AC-M3. The create handler validates required fields, `coachId`, positive duration and capacity, enum values, and the ISO timestamp, and returns `400 VALIDATION_FAILED` with `fieldErrors`. On success it returns `201 SessionDetails` with a generated id and timestamps and the coach taken from the coaches fixture. It stores the session in memory so later list and details reads return it.
- AC-M4. When the mock starts, it shifts every fixture `startsAt`/`createdAt`/`updatedAt`/`cancelledAt` by (now − `referenceNow`). Tests freeze the clock and apply the same transformation.
- AC-M5. All six required scenarios can be selected deterministically. Scenario selection happens only at the mock boundary: no presentation component or API client branches on scenario names.
- AC-M6. Application code makes ordinary HTTP requests through a single client module. Components and the client never import fixture JSON. A real backend could replace MSW without changes to presentation components.
- AC-M7. Dates are parsed and normalized at a single boundary and displayed in the user's local timezone.
- AC-M8. Server and request state each have one clear owner, with no duplicated source of truth (for example, the list isn't stored both in a cache and in component state).
- AC-M9. The app works offline with the mock after setup.

### 4.6 Responsive Behavior

- AC-R1. At 1440×900 the layout is optimized for comparing sessions and for repeated actions (a dense table or similar).
- AC-R2. At 390×844 every piece of content and every action can be reached. Rows may become a list that is easy to scan. Nothing overlaps and the page never scrolls horizontally.

### 4.7 Accessibility

- AC-A1. The full flow (list → filter → details → close → create → submit) can be completed with the keyboard alone.
- AC-A2. Focus states are visible on every interactive element.
- AC-A3. Controls are semantic (`button`, `a`, `input`, `select`, `table` or list) and every control has a label.
- AC-A4. The page has a meaningful heading hierarchy (one `h1`, plus section headings for the list, details, and create form).
- AC-A5. Loading, result count, mutation success, and errors are announced through appropriate live regions or `role="status"`/`role="alert"`, without excessive announcements.
- AC-A6. Text and controls meet WCAG AA contrast using `DESIGN_TOKENS.md`.
- AC-A7. Any motion respects `prefers-reduced-motion`.

### 4.8 Testing (owned by `coder`)

- AC-T1. Four to six focused, behavior-level tests that together cover the items marked **[T]**: search + status filter, create validation, successful create, create server failure preserving input, initial loading, empty + no-matches, and one list-or-details error. Tests run against the MSW handlers (node) with a frozen clock.
- AC-T2. `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.

### 4.9 Operability

- AC-O1. The app starts with a documented project command (`npm run dev`). The README explains how to select a scenario.

## 5. Constraints

- React 19, TypeScript ≥5.9, Vite ≥7, npm, `msw@2.14.6`.
- Every additional dependency (for example a router or data library) needs a recorded reason and trade-off. Don't add a data library only because React rules mention one.
- Don't rewrite unrelated source code or configuration. `frontend-accelerator-assessment/` must stay unchanged.
- Don't change the contract. Any proposed change must be recorded separately and needs evaluator approval.
- No i18n (centralizing copy is optional). No secrets, real personal data, or analytics.
- Visual direction: an operational tool following `DESIGN_TOKENS.md`. The SVG reference shows hierarchy and density, not pixels. No hero sections, decorative gradients, or excessive nested cards.

## 6. Non-Goals

Backend; authentication or registration; payments; real email or notifications; drag-and-drop calendar; recurring rules; attendee management; organization administration; deployment or hosting; a different product.

**Optional extensions, deferred unless the developer chooses otherwise:** type filter, URL filter synchronization, pagination, cancellation (403/409), read-only permission, background refresh / `slow-refresh`, tablet verification, `create-conflict`/`unknown-session` scenarios, optimistic updates, extra tests, calendar or saved views. Optional work does not make up for missing required behavior.

## 7. Assumptions (unconfirmed; check during planning)

- A1. Create is offered as a separate view, panel, or dialog inside the workspace. The spec doesn't fix its placement (owner: `ui-designer`).
- A2. "Recently completed" doesn't require any special sort or time window beyond what the fixtures and the server return. The list shows the server's order.
- A3. Scroll restoration for AC-L7 is best effort. Filters and the opened row are the required list context.
- A4. A `400 INVALID_FILTER` response can't be triggered from the UI, because the status control offers only valid values. It is still implemented in the handler.
- A5. Entering a date or time that is no longer in the future at submit time (for example, the clock passed it while the form was open) fails client validation when the user submits.

## 8. Open Questions and Owners

| ID | Question | Owner | Blocking? |
| --- | --- | --- | --- |
| OQ-1 | Should the details view be a route or a drawer/modal? Should a router dependency be added to support deep links, and should list context be kept in the URL (filter URL synchronization is optional) or in memory? | `architect` | Blocks the plan |
| OQ-2 | Who owns server state (a plain hook plus a client module, or a data library)? How is the list refetched after a create? Where does date normalization live? | `architect` | Blocks the plan |
| OQ-3 | How is a scenario selected (for example `?scenario=` read only in mock bootstrap, an env var, or a dev-only switcher)? How are the MSW worker and the node server set up for tests? What client error model maps `ApiError` and network failures? | `api-integration` | Blocks the plan |
| OQ-4 | Desktop table vs. mobile representation, placement of create (A1), status indicator design, and the pattern for confirming success and resetting filters (AC-C8) | `ui-designer` | Blocks the plan |
| OQ-5 | Developer: implement any optional extensions? Default is none. | developer | No |

## 9. Evidence Dependencies (from `EVIDENCE_PROTOCOL.md`)

`tasks/TASK-001/` must eventually contain: `requirements.md` (this file), `architecture.md`, `api-integration.md`, `ui-design.md`, `implementation-plan.md`, `workflow-log.md`, `review.md`, `browser-verification.md`, `verification.md`, `final-report.md`, and `evidence/` with `populated-desktop.png`, `populated-mobile.png`, and screenshots of additional flows. A pre-`coder` checkpoint commit (or an equivalent record of order) is required.

## 10. Readiness

The product requirements are complete and testable, and no product ambiguity needs `brainstorm`. Architecture (OQ-1, OQ-2), API integration (OQ-3), and UI design (OQ-4) decisions are still open and must be made before `writing-plans`.
