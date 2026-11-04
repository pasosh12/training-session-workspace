# TASK-001 Browser Verification

**Verdict: FAIL.** One required check, create failure (useful recovery), fails on visibility: BV-1. One low cosmetic defect was also found: BV-2. Every other requested check passes.

| | |
| --- | --- |
| Role | `browser-verify` (read-only; no code, test, config, or data changes) |
| Date | 2026-11-04 (about 18:31–18:45 CET by this session's log times) |
| Code under test | HEAD `4231aac` (working tree: only `info/workflow-log.md` and `tasks/TASK-001/review.md` modified, no `src/` changes) |
| URL | `http://localhost:5173/`. Found by inspecting the running process: PID 163062 `node …/node_modules/.bin/vite` (parent `npm run dev`, PID 163050) listening on `127.0.0.1:5173` (`lsof`). `curl` returned 200 with `<title>Training sessions</title>`, and `/mockServiceWorker.js` returned 200. |
| Server ownership | **Developer-owned.** This role neither started nor stopped any server. PID 163062 was still running after verification. |
| Browser | Project adapter `node toolchain/bin/agent-browser.mjs` (`agent-browser@0.32.3`), HeadlessChrome/156.0.0.0 (X11; Linux x86_64) |
| Adapter session | `task001-bv-20261104` |
| Readiness | `node ./toolchain/bin/doctor.mjs --json` → `DEGRADED`. `capability:browser` PASS; only `hooks:codex` DEGRADED, which is not a browser blocker. |
| Viewports | 1440 × 900 (desktop), 390 × 844 (mobile) |
| Evidence folder | `tasks/TASK-001/evidence/`, 16 PNG files listed in §4 |

Method notes:
- Interactions used adapter `click`, `dblclick`, `fill`, `select`, `press`, and `batch` on CSS or role locators.
- `eval` was used **read-only**, to read DOM state (URL, focus, values, geometry). It was also used in two places to fire several close or submit clicks inside one JavaScript task. That was the only way to reproduce "faster than a render/popstate" input. No application state was written through `eval`.
- In the §4.4.1 check, a listener was attached to the dialog only to *count* native `cancel`/`close` events.

---

## 1. Per-check verdicts

| # | Check | Verdict | Evidence |
| --- | --- | --- | --- |
| C1 | Populated workspace, desktop 1440×900: screenshot and accessibility snapshot | **PASS** | `populated-desktop.png`. Interactive snapshot (`snapshot -i`) excerpt: `heading "Training sessions" [level=1]`, `button "Create session"`, `region "Filters"` → `searchbox "Search"`, `combobox "Status"` (All statuses / Scheduled / Full / Cancelled / Completed), `button "Clear filters" [disabled]`; `region "5 sessions"` → `heading "5 sessions" [level=2]`, `columnheader` ×5 (SESSION, START, COACH, CAPACITY, STATUS), and per row `cell` + `link` (e.g. `link "U14 Shooting Lab"`), `cell "14 / 18 4 places left"`, `cell "Scheduled"`. Status is text plus an icon shape (○ Scheduled, ● Full, ✕ Cancelled, ✓ Completed). No horizontal overflow (`scrollWidth 1440 = clientWidth 1440`). The fixture clock is rebased: dates are in Nov 2026, and the past session shows as Completed. |
| C2 | Populated workspace, mobile 390×844: screenshot, keyboard reachability, overflow | **PASS** | `populated-mobile.png` shows stacked rows with title, badge, start and duration, coach, and "14 / 18 booked · 4 places left". `scrollWidth 390 = clientWidth 390`. The only element extending past the viewport is a `TH` inside the visually hidden, clipped table header, so it isn't rendered. No interactive control is under 44 px tall. Tab order: Skip link → Create session → Search → Status → the 5 row links → wraps. Every stop had `outline: solid 2px` and was in view. Disabled Clear filters is skipped, as designed. Explicit table roles are kept in mobile layout (`columnheader`/`cell` in the snapshot). |
| C3 | Create: validation | **PASS** | `create-validation-desktop.png`. Opening the drawer focuses Title (F17). Submitting empty shows 6 messages next to their controls, for example "Enter a title of 3 to 80 characters." and "Enter a date. Enter a start time." Each invalid control has `aria-invalid="true"` and `aria-describedby` pointing to its error id, focus goes to Title (F22), and `POST /api/sessions` was sent 0 times. Errors clear live while correcting. |
| C4 | Create: no double submit | **PASS** | With the real 250 ms mock latency, 4 submit activations (2 synchronous `click()` calls in one task, 1 more 50 ms later, then an adapter `dblclick`) produced exactly **one** `POST /api/sessions → 201`. While pending (create-error run, see C7) the button read "Creating…" with `aria-disabled="true"`, Title was `readOnly`, and close × was `aria-disabled`. |
| C5 | Create: success banner and finding the new session | **PASS** | `create-success-desktop.png`. The drawer closes, focus goes to the header Create session button (F27), and the banner (`role="status"`) reads "Session “U16 Rebounding Clinic” created. It's marked New in the list." with [Open Session] and ×. The list goes 5 → 6 sessions and the new row has a "New" tag. A local start of 18:00 on 2026-11-20 displays as "Fri, Nov 20, 06:00 PM", so the local → UTC → local round trip is correct. |
| C6 | Create: filters hide the new session (AC-C8) | **PASS** | `create-hidden-by-filter-desktop.png`. With Status = Cancelled, create shows "Session “Hidden Filter Check” created. The current filters hide it." with [Open Session], [Show All Sessions], ×. The list stays at "1 session" with no new row. [Show All Sessions] resets Status to All, moves focus to [Open Session] (F28), shows the list at 7 sessions with the row tagged "New", switches the banner to "It's marked New in the list.", and removes [Show All Sessions]. [Open Session] opens `?session=ses_new_2` with the drawer heading focused (`details-new-session-desktop.png`, including "No description." and "No trainer notes."). |
| C7 | Create failure via `?scenario=create-error` keeps entered values | **FAIL (BV-1)**: values PASS, visible recovery FAIL | `create-error-desktop.png`, `create-error-mobile.png`. Console `[mocks] scenario: create-error`; `POST /api/sessions → 500`. **Values kept:** all 9 entered values are unchanged (title, date 2026-11-22, time 10:15, duration 60, capacity 20, coach `coach_03`, location name, address, notes "Bring cones"). The drawer stays open, submit is enabled again, and focus is on submit (F26). The form-level `role="alert"` contains "The session couldn't be created. Your entries are kept. Submit again to retry." **But that alert is scrolled out of view** at both viewports. See BV-1. |
| C8 | Empty (`?scenario=empty`) vs no matches: different messages with recovery | **PASS** | `empty-desktop.png`: heading "No sessions", empty state "No sessions yet / Create the first session to start building the schedule." with [Create session]. It opens the drawer (focus on Title), and Cancel returns focus to that empty-state button (F18). `no-matches-desktop.png`: typing "zzz" sent one debounced `GET /api/sessions?query=zzz → 200` and showed "No matching sessions / No sessions match “zzz”. / Try a different search or clear the filters." with [Clear filters]. Clearing restores "5 sessions" with focus on Search (F15). The status region text differs too ("No sessions" vs "No sessions match these filters"). |
| C9 | List error with retry (`?scenario=list-error`) | **PASS** | `list-error-desktop.png`: `role="alert"` "Sessions couldn't load / Sessions can't be loaded right now. Try again in a moment." with [Try Again]; Search and Status stay enabled. Retry by keyboard (focus + Enter) shows "Trying again…" with `aria-disabled="true"` 80 ms later, then the same alert again with focus kept on [Try Again] (F13). The network shows `GET /api/sessions → 500`. |
| C10 | Details error with retry (`?scenario=details-error`) | **PASS** | `details-error-desktop.png`: the drawer for `ses_101` shows `role="alert"` "Details couldn't load…" with [Try Again] and [Back to Sessions]. Retry sends `GET /api/sessions/ses_101 → 500` again and focus stays on [Try Again]. [Back to Sessions] closes and focuses the row link. Other sessions load normally under the same scenario. `ses_104` shows the cancellation block "✕ Cancelled / Cancelled on Nov 4, 2026, 5:35 PM. / Reason: The gym is unavailable." (`details-cancelled-desktop.png`). A deep link `/?scenario=details-error&session=ses_101` opens directly into the failure with the drawer h2 focused (F2). |
| C11 | Coaches error (`?scenario=coaches-error`, optional alternative) | **PASS** | `coaches-error-desktop.png`: the Coach select is disabled; inline `role="alert"` "Coaches couldn't load, so a coach can't be chosen yet. Try again. Your other entries are kept." with [Retry Loading Coaches]; submit is natively disabled with the hint "Creating is unavailable until coaches load."; `GET /api/coaches → 500`. |
| C12 | Escape ×3 fast on a dirty create form (ui-design §4.4.1) | **PASS** | `create-escape-x3-desktop.png`. With Title "Draft Escape Test" and Location "Gym A", `batch "press Escape" ×3`: the drawer stays open, both values are intact, the discard bar is shown, and focus is on [Keep Editing]. This is the expected result for an odd count (bar → keep editing → bar). A 4th Escape hides the bar with focus back on Title (F20/F38). A further burst of 6 (10 in total) leaves it open with values intact. **Native event count during a fresh burst of 3: `cancel` 0, non-cancelable `cancel` 0, `close` 0.** Intercepting Escape at keydown (rule 1) fully suppressed Chrome 156's close request, so the reconciliation fallback (rule 3) wasn't needed in this browser. [Discard] then closes the drawer with focus returned to the trigger (F21). |
| C13 | Double-closing details must not leave the page (R-1) | **PASS** | History length was 3 (`about:blank`, `/`, `/?session=…`). (a) Adapter `dblclick` on "Close details": URL `http://localhost:5173/`, list still "7 sessions" (the in-memory store is intact, so no reload or navigation away), focus on the row link (F5). (b) `batch "press Escape" ×2` on `ses_102`: same result. (c) 3 synchronous `click()` calls on Close plus a dispatched keydown Escape, all in one task, on `ses_103`: same result (URL `/`, 7 sessions, drawer closed). `history.length` stayed 3 throughout. |
| C14 | `?scenario=` survives opening and closing details | **PASS** | Under `?scenario=details-error`: the row `href` is `/?scenario=details-error&session=ses_101` (R-3); open → `?scenario=details-error&session=ses_101`; Back to Sessions → `?scenario=details-error`; Escape on `ses_104` → `?scenario=details-error`. A reload kept the scenario (console `[mocks] scenario: details-error`), and closing a deep-linked details view removes only `session` (`http://localhost:5173/?scenario=details-error`). |
| C15 | Console messages | **PASS** | No `error` or `warn` entries were observed. Non-debug messages were only React's DevTools info line (once per load) and one `[mocks] scenario: <name>` per load (normal ×2, create-error ×2, details-error ×3, empty, list-error, coaches-error). Vite `[debug]` connect lines are not app output. Note: the console buffer was cleared twice (before the create flow and before the Escape test), so console coverage is per segment, and each segment was checked when it ended. |
| C16 | Page errors | **PASS** | `errors` was empty at every checkpoint and never cleared: no uncaught exceptions in any demonstrated flow. |
| C17 | Network statuses | **PASS** | Every app request went to contracted `/api` paths. Every non-2xx response is scenario-intended: `POST /api/sessions 500` (create-error), `GET /api/sessions 500` (list-error), `GET /api/sessions/ses_101 500` (details-error), `GET /api/coaches 500` (coaches-error). Success paths returned 200/201. There were no 4xx responses and no unexpected navigation. Entries without a status are the page-side half of service-worker-handled request pairs. Doubled initial requests come from React StrictMode effects in dev, where the first request is aborted. |
| C18 | Mobile drawers | **PASS** (apart from BV-1 and BV-2) | `details-mobile.png`: the details drawer is a full-width (390 px) sheet with no body overflow, a 44 px close button, a sticky [Back to sessions] footer, and a visible focus ring on the heading. The create drawer is also full width, with the footer actions [Cancel]/[Create session] reachable at the bottom and no horizontal overflow. |

## 2. Findings

### BV-1 · Should-fix · the form-level create error is not visible after a server failure

- **Where it shows:** the create drawer at 1440×900 and 390×844 (`create-error-desktop.png`, `create-error-mobile.png`).
- **What happens:** to reach the lower fields and the footer, the user scrolls the drawer body down. On `500 CREATE_SESSION_FAILED`, the form-level error box is rendered at the **top** of the body. Focus stays on the footer submit button (F26), and nothing scrolls the box into view.
- **Measured at 390×844, native:** body `scrollTop` 491, error box `top −398 / bottom −332` vs header bottom 77, so it is entirely above the visible area. At 1440×900 the same thing happens: the screenshot starts at the "Start" row, and both the error box and Title are above the fold.
- **Impact:** the only visible change after the failure is the button label returning from "Creating…" to "Create session". A sighted user can't tell whether creation worked, which conflicts with the intent of AC-C6 ("useful form-level error") and the success/failure visibility requirement. Screen-reader users do get the `role="alert"` announcement, and the entered values are kept.
- **Repro:** open `http://localhost:5173/?scenario=create-error`, open Create session, fill every required field top to bottom, then click Create session.
- **Likely owner:** `ui-designer` to decide (F26 vs moving focus or scrolling the error into view, or placing the error next to the footer), then `coder`. This role doesn't decide the fix. Note: N-1 (review round 2) concerns the same form-level box.

### BV-2 · Low · input suffixes break mid-word

- **Where it shows:** the Duration and Capacity fields at both viewports.
- **What happens:** the "min" and "places" suffixes wrap inside the word ("mi / n", "plac / es" at 1440; "mi / n", "place / s" at 390).
- **Likely cause** (from rendered styles, not proven in code): the global `overflow-wrap: anywhere` combined with a shrinking flex suffix.
- **Impact:** cosmetic and readability only; the inputs and labels are unaffected.
- **Likely owner:** `coder` (CSS).

## 3. Not verified in this run

- Screen-reader announcements (L1–L5). Live-region contents and roles were inspected in the DOM, but no assistive technology was run.
- Rendered contrast measurement. Visually it is consistent with the token analysis in ui-design §10, but it wasn't measured with a tool.
- `prefers-reduced-motion` (not toggled); a tablet viewport (optional); `beforeunload` prompt behavior (not triggered, to avoid blocking dialogs); touch gestures and the Android back gesture (headless desktop Chrome only).
- Non-Chrome browsers. The §4.4.1 result (0 `cancel` events) is specific to HeadlessChrome 156.
- The R-1 check proves the app stays on the page in Chrome. It doesn't distinguish whether Chrome itself would have coalesced the old double `history.back()`, because the pre-fix code wasn't re-run in the browser.

## 4. Evidence files (`tasks/TASK-001/evidence/`)

| File | Shows |
| --- | --- |
| `populated-desktop.png` | **Required.** Populated workspace, 1440×900 |
| `populated-mobile.png` | **Required.** Populated workspace, 390×844 |
| `create-validation-desktop.png` | Empty submit with field errors |
| `create-success-desktop.png` | Success banner and new row with the "New" tag |
| `create-hidden-by-filter-desktop.png` | AC-C8 banner with [Show All Sessions] |
| `details-new-session-desktop.png` | New session opened from the banner (details drawer) |
| `create-escape-x3-desktop.png` | Dirty form after 3 fast Escapes (discard bar, values intact) |
| `create-error-desktop.png` | create-error at desktop: values kept, error box scrolled out of view (BV-1), suffix wrap (BV-2) |
| `create-error-mobile.png` | create-error at 390, native run: same as above |
| `empty-desktop.png` | `?scenario=empty` empty state |
| `no-matches-desktop.png` | No-matches state for "zzz" |
| `list-error-desktop.png` | `?scenario=list-error` with [Try Again] |
| `details-error-desktop.png` | `?scenario=details-error` in-drawer error |
| `details-cancelled-desktop.png` | Cancelled session with cancellation block |
| `coaches-error-desktop.png` | `?scenario=coaches-error` coach control and disabled submit |
| `details-mobile.png` | Details drawer at 390×844 |

## 5. Session closure

- The adapter session `task001-bv-20261104` was closed with `close` ("✓ Browser closed").
- A follow-up `get url` probe on that session name re-created an `about:blank` session. That was this role's own session, and it was closed again.
- The final `session list` showed **"No active sessions"**.
- No other session or user browser was touched. The developer's Vite server (PID 163062) was left running.

---

## Remediation (coder, after browser-verify)

Date 2026-11-04. Base: HEAD `4231aac`, plus the developer's uncommitted ui-design F26 amendment. This section records the code change only. **The browser verdict above (FAIL) is unchanged until a new `browser-verify` run.** None of the fixes below has been checked in a browser yet.

| Finding | Status | Change | Test evidence |
| --- | --- | --- | --- |
| BV-1 | **fixed in code; browser re-check pending** | `src/features/sessions/create/CreateSessionDrawer.tsx` implements amended F26. After a failed create (500, network, contract, any non-2xx without mappable `fieldErrors`, and a 400 without `fieldErrors` per F25), an `errorFocusRequest` counter triggers an effect after render. The effect focuses the form-level error box (`tabindex="-1"`, `preventScroll`) and calls `scrollIntoView({ block: 'start' })` on it. The box is the first child of the scrollable drawer body, so this brings it to the top of the body below the sticky header. Scrolling uses the default instant behavior, which also satisfies reduced motion. This replaces the earlier `requestAnimationFrame` focus for F25. F24 (mapped field errors → first field) is unchanged. | `src/test/formErrorFeedback.test.tsx`, "F26 (amended)" block. For `create-error` (500) and a network failure, the box has focus, and `scrollIntoView` was called with `{ block: 'start' }` on the box. jsdom has no `scrollIntoView`, so the tests stub it to record calls. Both tests **failed before the fix** and pass after it. jsdom doesn't lay out, so the actual visible position needs a browser. |
| BV-2 | **fixed in code; browser re-check pending** | `src/features/sessions/sessions.css`: `.input-suffix span` gets `flex: none; white-space: nowrap; overflow-wrap: normal`, and `.input-suffix input` gets `flex: 1; min-width: 0`. The suffix no longer shrinks, and it is protected from the global `overflow-wrap: anywhere`. | No automated test: jsdom doesn't render layout. Needs the browser. |
| N-1 (review) | **resolved** | Implemented with BV-1 by developer decision, per the ui-design amendment rules. See `review.md`, "N-1 status update". | `formErrorFeedback.test.tsx`, "N-1" block. The removal and unmapped-message tests **failed before the fix** and pass after it. The 500-persists test passed before and after, as a guard. |

### Checks after this remediation

Run from `/home/user/WebstormProjects/training-sessions-workspace`:

| Exit | Command |
| --- | --- |
| 0 | `npm run typecheck` |
| 0 | `npm run lint` (0 warnings) |
| 0 | `npm test`: 6 files, 28 tests passed (was 23; +5 in `formErrorFeedback.test.tsx`). Two consecutive verbose runs, no stderr. |
| 0 | `npm run build` |
| 0 | `grep -rnE "scenario\|fixtures" src/app src/features src/api src/lib ; test $? -eq 1` |
| 0 | `grep -rnE "\bfetch\(" src --include='*.ts' --include='*.tsx' \| grep -v '^src/api/http.ts' ; test $? -eq 1` |
| 0 | `grep -rln "mocks" src/app src/features src/api src/lib ; test $? -eq 1` |
| 0 | `grep -rn "api/contract" src/features src/app src/lib ; test $? -eq 1` (added in round 1; not part of plan §6) |
| 0 | `test -f public/mockServiceWorker.js` |
| 0 | `test -z "$(git status --porcelain frontend-accelerator-assessment)"` |

Still open: a browser re-check of BV-1 (error box visible after a 500 at 1440×900 and 390×844, with focus on it) and BV-2 (suffixes on one line).
