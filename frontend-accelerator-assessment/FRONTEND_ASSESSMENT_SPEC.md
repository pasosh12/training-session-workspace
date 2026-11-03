# Training Sessions Workspace

Status: ready for assessment

## Objective

Implement a frontend workspace that lets a training-business operator find, inspect, and create scheduled training sessions.

This is a frontend-only assessment. Implement the provided API contract with MSW and keep it behind a replaceable frontend client boundary. Do not implement a backend.

## Product Context

A trainer runs several basketball programs with multiple coaches and locations. The existing process is split between a calendar, spreadsheets, and chat messages. The trainer needs one workspace for scheduled work and common scheduling actions, including visibility into cancelled and recently completed sessions.

The primary user is a busy trainer who repeatedly scans schedules, resolves capacity questions, and creates new sessions. The interface should favor fast scanning and predictable actions over decorative presentation.

## Required Vertical Slice

### 1. Sessions Workspace

Provide a route or equivalent navigable view for sessions.

The user can:

- see session title, type, status, start time, duration, coach, location, capacity, and booked count;
- search by session title, coach name, or location;
- filter by one status;
- clear all active filters;
- distinguish scheduled, full, cancelled, and completed sessions without relying on color alone;
- open a session without losing the current list context.

URL synchronization, session-type filtering, and pagination are optional extensions.

### 2. Session Details

Opening a session displays:

- all list information;
- session description and trainer notes;
- capacity summary;
- coach contact summary;
- created and last-updated timestamps;

The details experience may be a dedicated route, drawer, or modal. It must be keyboard accessible, deep-linkable when the router permits it, and return the user to the previous list state.

### 3. Create Session

Provide a form with:

- title;
- session type;
- date;
- start time;
- duration;
- coach;
- location name;
- location address;
- capacity;
- visibility;
- optional description and trainer notes.

Required validation:

- title: 3 to 80 trimmed characters;
- date and time: must resolve to a future start in the user's local timezone;
- duration: integer from 30 to 240 minutes;
- capacity: integer from 1 to 100;
- coach: required;
- location name: 2 to 80 trimmed characters;
- location address: 3 to 120 trimmed characters;
- trainer notes: maximum 500 characters.

Submission behavior:

- prevent duplicate submissions while pending;
- show field errors near their controls and a useful form-level error when appropriate;
- preserve entered values after an API failure;
- expose success without requiring the user to guess whether creation worked;
- make the created session discoverable in the workspace. When active filters would hide it, provide a clear action to open the new session or reset the relevant filters.


### 4. Required UI States

The implementation must make these states observable and testable:

- initial loading;
- populated result;
- no sessions exist;
- filters produce no matches;
- list request fails;
- details request fails;
- coaches request fails;
- create pending, success, validation failure, and server failure.

The MSW boundary must support the required deterministic scenarios named in `MOCKING_GUIDE.md`.

Scenario selection belongs at the mock boundary and must not leak transport branching across presentation components.

## Fixture Clock Policy

The JSON timestamps are anchored to the reference instant in `fixtures/fixture-clock.json`. At mock startup, rebase every fixture timestamp by the difference between the actual current instant and `referenceNow`. This preserves relative ordering while preventing the assessment data from becoming stale.

Automated tests should freeze their clock and apply the same boundary transformation. Production-facing components receive only valid ISO 8601 timestamps and must not know about fixture rebasing.

## Responsive Behavior

The workspace must remain usable at minimum at:

- 1440 x 900 desktop;
- 390 x 844 mobile.

Desktop should optimize comparison and repeated actions. Mobile may change table rows into another scan-friendly representation. No content or action may become unreachable, overlap, or require horizontal page scrolling at the required widths.

## Accessibility

Required behavior:

- complete keyboard operation;
- visible focus states;
- semantic controls and labels;
- useful page and section headings;
- programmatic association for validation errors;
- status and mutation feedback announced appropriately;
- non-color status indicators;
- sufficient text and control contrast;
- reduced-motion preference respected when motion is used.

## API Integration Boundary

Use `frontend-accelerator-assessment/API_CONTRACT.md` as the external contract.

- Components must not contain scattered raw transport calls.
- The MSW implementation must be replaceable by a real backend without rewriting presentation components.
- Server and request state must have a deliberate owner and avoid duplicated sources of truth.
- Do not introduce a data library solely because the default React rules mention React patterns.
- Parse and normalize dates at a clear boundary. Display them in the user's local timezone.
- Do not invent backend endpoints or silently change response shapes. Record proposed contract changes separately.

## Visual Direction

Use `frontend-accelerator-assessment/designs/DESIGN_TOKENS.md` as the fallback palette and spacing guide.

`frontend-accelerator-assessment/designs/sessions-dashboard-reference.svg` communicates hierarchy and density, not a pixel-perfect layout. The candidate owns responsive composition, interaction details, and component reuse decisions.

The product is an operational tool. Avoid marketing-page composition, oversized hero content, decorative gradients, and excessive card nesting.

## Testing Expectations

The `coder` owns tests essential to the implemented behavior. At minimum cover:

- search and status filtering;
- create validation and successful submission;
- create server failure preserving input;
- initial loading;
- no sessions and filters with no matches;
- one list or details request-error state.

Use the project's test stack and prefer behavior-level assertions over implementation details. Aim for four to six focused tests; add more only when risk justifies them.

Automated tests do not replace required browser evidence. The evidence matrix is defined in `frontend-accelerator-assessment/EVIDENCE_PROTOCOL.md`.

## Constraints

- React 19 is required.
- TypeScript 5.9 or newer is required.
- Vite 7 or newer and npm are required.
- Use `msw@2.14.6` for the mock API.
- Do not rewrite unrelated source code or configuration.
- Additional dependencies require a recorded reason and trade-off.
- Centralizing UI copy is optional; introducing i18n is out of scope.
- The solution must work with mocked API responses and without network access after accelerator setup is complete.
- The assessment input directory must remain unchanged.
- Secrets, real personal data, analytics, and production credentials are prohibited.

## Non-Goals

- backend implementation;
- authentication or account registration;
- payments;
- real email or notification delivery;
- drag-and-drop calendar scheduling;
- recurring session rules;
- attendee management;
- organization administration;
- deployment or public hosting;
- replacing the supplied product brief with a different application;
- implementing every optional idea in the source product domain.

## Optional Extensions

Optional work does not compensate for missing required behavior:

- session-type filtering;
- URL synchronization of filters;
- pagination;
- session cancellation, including `403` and `409` recovery;
- read-only permissions;
- background refresh;
- tablet-specific verification;
- `create-conflict` and other optional mock scenarios;
- optimistic updates with rollback;
- additional automated or visual regression tests;
- calendar or saved-filter views.

## Required Evidence

Provide every artifact and observation listed in `frontend-accelerator-assessment/EVIDENCE_PROTOCOL.md`, including:

- requirements and a file-level implementation plan created before production implementation;
- recorded architecture, API, and UI decisions that materially affected the result;
- automated test output;
- desktop and mobile screenshots of the populated state;
- browser evidence for create, empty, and representative error flows;
- console, page-error, and failed-network observations from browser verification;
- final verification verdict with unverified items named explicitly;
- workflow evidence showing manual role selection and STOP boundaries;
- developer-reported start, finish, breaks, active time, and calendar time.

## Definition Of Done

The assessment is complete when:

1. accelerator Doctor is not `BLOCKED`, and the assessed runtime's hook status and setup evidence are recorded;
2. every required acceptance behavior is implemented or explicitly reported as missing;
3. the app can be started using a documented project command;
4. required automated tests exist and pass;
5. browser verification covers all required viewports and state evidence;
6. no uncaught console error occurs during the demonstrated primary flows;
7. the final report lists checks run, limitations, assumptions, and trade-offs;
8. the evaluator can reproduce the result from repository instructions;
9. the evidence protocol is complete and truthful.

The scoring model is defined in `frontend-accelerator-assessment/EVALUATION_RUBRIC.md`. There are no hidden assessment requirements.
