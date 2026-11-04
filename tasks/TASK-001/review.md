# TASK-001 Code Review

**Verdict: NEEDS-CHANGES.** There are 2 should-fix findings (R-1, R-2) plus 8 low or info findings. There are no blocking findings.

| | |
| --- | --- |
| Reviewer | `code-reviewer` (read-only) |
| Date | 2026-11-04 |
| Range | `c860590..HEAD`: one commit, `2ee0db8 feat(TASK-001): training sessions workspace implementation`. Working tree clean; `src/` at HEAD equals the working tree. |
| Reviewed against | `tasks/TASK-001/requirements.md`, `architecture.md` (including the 2026-11-04 AD-7 amendment), `api-integration.md`, `ui-design.md`, `implementation-plan.md`; developer decisions in `info/workflow-log.md` (2026-11-04 18:09 row) |
| Rulesets | `rulesets/common/code-reviewer/rules/evidence-first-review.md`, `rulesets/framework/code-reviewer/INDEX.md` (via the React coder index), `rulesets/common/shared/web-interface-guidelines/command.md` |
| Evidence used | Source reading at HEAD and `grep` checks, shown inline. I didn't run the test suite, build, or browser for this review; the coder's reported results (17/17 tests, every §6 check exits 0) are taken from the coder report and not re-verified here. |

Severity scale:
- **Blocking**: must be fixed before merge.
- **Should-fix (Medium)**: a real defect or missing required proof.
- **Low**: a minor defect or inconsistency.
- **Info**: no code change needed.

---

## Findings

### R-1 · Should-fix (Medium) · correctness: closing details twice quickly navigates back two history entries

- **Where:** `src/lib/useUrlParam.ts:54-63` (`close()` calls `window.history.back()` when `history.state[PUSHED_KEY] === name`). It is reached from every details close path:
  - `src/features/sessions/details/SessionDetailsDrawer.tsx:144, 165-167, 171` (Back buttons, backdrop, `onCloseRequest`)
  - `src/features/sessions/ui/Drawer.tsx:93, 164` (Escape at keydown, × button)
- **Problem:** `history.back()` is asynchronous. Until `popstate` fires, `location.search` still contains `session` and `history.state` still carries the marker. A second close request in that window passes both guards and calls `history.back()` again. Two traversals are queued, and the page goes back **two** entries.
- **Failure scenario:**
  1. Arrive at the app from another page, or open it in a tab that has prior history.
  2. Click a session title. This pushes `?session=ses_101`, so the history is `[previous page, /, /?session=ses_101]`.
  3. Press Escape twice quickly, or double-click "Back to sessions" or the backdrop.
  4. **Expected:** details close and the list stays. **Actual:** the browser leaves the workspace for the previous page. Inside the app, it lands one entry before the list.
- **Why it matters:** ui-design §4.4.1 explicitly anticipates fast double Escape (Chrome's non-cancelable second Escape). The fix for that case made this path more likely, not less: each keydown calls `closeDetails()` again. AD-1 requires that no close path desynchronize the URL and the UI, and this desynchronizes the user's history. None of the tests covers it: E1 and E4 close details only once.
- **Suggested direction (non-binding):** make `close()` idempotent while a back traversal is pending, for example with a "closing" flag cleared on the next `popstate`. The details `onCloseRequest` could also ignore requests while the param is already closing. Add a regression test that calls close twice and asserts the history position.
- **Status:** unresolved. Follow-up: `debugger` (prove in a browser and fix) or `coder`.

### R-2 · Should-fix (Medium) · missing meaningful test: the AC-C8 "filters hide the new session" path is untested

- **Where:**
  - Logic: `src/features/sessions/SessionsWorkspace.tsx` (the `phase` derivation from `list.settled` vs `lastCreated.since`, the banner variants at `:175`, `showAllSessions`)
  - Tests: `grep -rn "hide it\|Show All Sessions" src/test` → no matches (exit 1)
- **Problem:** AC-C8 is required behavior. The spec says: "When active filters would hide it, provide a clear action…". The rubric scores "keeps the new session discoverable". The implementation uses non-trivial derived logic: a settled-run counter, abort ordering, and a 500 ms settle timer. T4 covers only the "present" variant. Nothing proves the following:
  - the hidden variant appears when, for example, `status=cancelled` is active during a create;
  - [Show All Sessions] clears the filters, moves focus to [Open Session] (F28), and switches the banner to the "present" variant;
  - the refetch-failed variant ("The list couldn't refresh.") works.
- **Failure scenario:** a regression in the `settled`/`since` comparison, for example an in-flight list run settling just after the create, would show the wrong banner variant or none at all. All 17 tests would still pass.
- **Status:** unresolved. Follow-up: `test-generator`. The implementation logic itself looked correct on reading.

### R-3 · Low · contract fidelity: row links drop other query parameters

- **Where:** `src/features/sessions/list/SessionsTable.tsx:50`, `href={`?session=${…}`}`
- **Problem:** a plain click goes through `useUrlParam.push()`, which preserves parameters correctly. But the `href` itself is a bare `?session=<id>`. Ctrl/Cmd-click, middle-click, and "Copy link address" all produce a URL **without** `scenario=` (and without the hash and other params). api-integration §3.2 says "a reload or a copied deep link therefore reproduces the same scenario". The AD-1 amendment requires parameter preservation.
- **Failure scenario:** during browser verification on `/?scenario=details-error`, middle-click "U14 Shooting Lab". The new tab opens `/?session=ses_101` in the **normal** scenario and shows the details successfully instead of the details error.
- **Status:** unresolved. Follow-up: `coder`. Build the `href` with the same `urlWith(name, value)` logic.

### R-4 · Low · copy: "The current filters hide it." is shown when no filter is active

- **Where:** `src/features/sessions/SessionsWorkspace.tsx:175`
- **Problem:** the hidden variant means "not on the refetched page 1". AD-4 accepts that more than 10 matches can push a new session off page 1. In that case the banner still claims the *filters* hide it and offers [Show All Sessions], which does nothing because no filters are active. The in-memory store reaches this after 6 creates (5 fixtures + 6 > 10).
- **Status:** accepted limitation. AD-4 explicitly accepts the page-1 edge for v1, since pagination is optional. The copy mismatch is noted for a future copy tweak (for example "It isn't on the first page of results.").

### R-5 · Low · announcement: the "List updated:" prefix sticks after [Check Sessions List]

- **Where:** `src/features/sessions/SessionsWorkspace.tsx:43, 116, 161, 259`
- **Problem:** `listCheckRequested` is reset only when the filters change. After the user presses [Check Sessions List] (§6.4, F33), every later list announcement is prefixed "List updated:" until a filter changes. That includes the refresh after a subsequent successful create.
- **Status:** unresolved. Follow-up: `coder`. Reset the flag after the next settled run.

### R-6 · Low · state: a filter change while the list is in error shows "Trying again…" on the Retry button

- **Where:** `src/features/sessions/hooks/useAsyncResource.ts:47` (any re-run from the error state sets `isRetrying: true`)
- **Problem:** under `list-error`, typing in Search or changing Status re-runs the resource. The Retry button switches to "Trying again…" and becomes `aria-disabled`, even though the user didn't press it. The state is readable but misattributed.
- **Status:** unresolved. Follow-up: `coder`. Distinguish a user retry from a key change, or show the list loading state when the key changes.

### R-7 · Low · forms: any edit clears server-mapped field errors

- **Where:** `src/features/sessions/create/CreateSessionDrawer.tsx:109` (`if (submitAttempted) setErrors(validate(next, …))`)
- **Problem:** after a `400 VALIDATION_FAILED` with `fieldErrors` (E2), editing *any* field replaces all errors with client validation. For example, typing in Title removes the server's "Unknown coach" message under Coach, even though the coach value hasn't changed. The user may resubmit without seeing why the server rejected it. AC-C4 is met at the moment of response, but the message isn't stable.
- **Status:** unresolved. Follow-up: `coder`. Keep a server error for a field until that field changes.

### R-8 · Low · architecture/AD-7: a feature hook imports `api/contract.ts`

- **Where:** `src/features/sessions/create/useCreateSession.ts:2`, `import type { CreateSessionRequest } from '../../../api/contract'`
- **Evidence:** `grep -rn "api/contract" src/features src/app src/lib` → 1 match (exit 0).
- **Problem:** the 2026-11-04 AD-7 amendment states "**`features` never imports `api/contract.ts`**". This is a type-only import, so there is no runtime effect. But it is the exact boundary the amendment was written to protect, and none of the plan §6 greps checks it.
- **Status:** unresolved. Follow-up: `coder`. Re-export the request type from `api/types.ts`, or type `submit` against `api/sessions.ts`'s parameter. Consider adding a grep for `api/contract` in `src/features src/app src/lib` to the verification set.

### R-9 · Low · performance: the mock bundle loads even when mocks are off

- **Where:** `src/main.tsx:8`. The dynamic `import('./mocks/browser')` always runs; the `VITE_API_MOCKING` check happens inside the module at `src/mocks/browser.ts:8`.
- **Problem:** with `VITE_API_MOCKING=off` (a real backend), the client still downloads the mock chunk, which contains MSW and the fixtures. The coder's build output shows `dist/assets/browser-*.js` at 435 kB (162 kB gzip). AD-6 intends the mock layer to be removable, and checking the env before the import would let Vite drop the chunk.
- **Status:** unresolved. Follow-up: `coder`. This is low priority because P-3 turns mocks on in all modes for this assessment.

### R-10 · Info · docs: ui-design F6 no longer matches the implemented rule

- **Where:** `tasks/TASK-001/ui-design.md:340` (F6) vs `src/features/sessions/SessionsWorkspace.tsx:94`
- **Problem:** the developer resolved the F6 vs §7 conflict in favor of §7 (workflow log, 2026-11-04 18:09). The banner is dismissed when details opened from it are closed, and focus follows F5. `ui-design.md` still states F6, so the document and the code disagree for the browser-verify and evaluator readers.
- **Status:** accepted limitation for the code (developer decision). The documentation update is open. Follow-up: `ui-designer` (amend F6) or `docs-generator`.

---

## Coder's Stated Deviations: Assessment

| # | Deviation | Acceptable? | Reasoning |
| --- | --- | --- | --- |
| D-1 | Domain types in `src/api/types.ts`; `features/sessions/model.ts` holds feature-only types and re-exports | **Yes** | Matches the 2026-11-04 AD-7 amendment. `grep -rnE "from '\.\./features\|from '\.\./mocks\|from 'react'" src/api` → no matches, so the direction `api ↛ features` holds. The single violation in the other direction is R-8. |
| D-2 | Form value type defined in `src/api/mappers.ts` as `CreateSessionInput`; `features/create/formValues.ts` aliases it | **Yes** | This is the same dependency-direction reason as D-1: `toCreateSessionRequest` is an `api` function and must own its input type. The developer accepted it without an extra architect run. The coder should have stopped instead of deciding it, per the instruction, but disclosed it. |
| D-3 | Tests in `src/test/` instead of `src/features/sessions/SessionsWorkspace.test.tsx` | **Yes** | Required by the plan's own scenario-isolation grep, which covers `src/features`, while the tests must select scenarios. This is consistent with the developer's E1 correction. Test helpers were already planned in `src/test/`. |
| D-4 | `aria-busy` on the results `<section>` rather than the table | **Yes** | No `<table>` exists during the initial load, so the busy state has to sit on the region that contains it. `ResultsSection.tsx:107` also sets it during refresh. T2 asserts it. |
| D-5 | F6 vs §7: the banner is dismissed after open-via-banner-then-close, and focus follows F5 | **Yes (code)** | This was the developer's decision. The behavior is coherent: the banner's purpose (discoverability) is complete once the session has been opened. The remaining doc mismatch is R-10. |
| D-6 | Minor additions: `ui/fieldA11y.ts`, `quiet: true` on worker start, an emptied search bypassing the debounce, `resolveJsonModule` only | **Yes** | `fieldA11y.ts` resolves an oxlint `only-export-components` warning. `quiet` keeps console evidence focused, and the scenario `console.info` remains. The immediate empty query implements AD-2's "Clear all requests immediately". P-5 used its minimal variant. |

## Checked and Found Consistent (no finding)

- **Transport isolation:** a single `fetch` in `src/api/http.ts`. Abort errors are rethrown, and network, contract, and HTTP failures are classified per api-integration §2.3. Create sends no `AbortSignal`.
- **Mock boundary:**
  - fixture JSON is imported only in `src/mocks/fixtures.ts`;
  - scenario overrides are taken verbatim from `mock-scenarios.json`, and `empty` is implemented as an empty seed;
  - `create-error` fires before validation;
  - the list handler filters, sets `total`, then slices to 10, with `INVALID_FILTER` for repeated or unsupported params;
  - the fixture clock rebase is pure and covers the nested `cancelledAt`.
- **AD-1:** details open state comes only from `?session=`. The §4.4.1 guard uses an app-initiated flag, keydown interception, and reconciliation of cancel and close. The create drawer reopens while dirty or pending.
- **AC-C5:** a synchronous in-flight ref plus `aria-disabled`. T4 double-clicks and asserts exactly one POST. Pending selects and radios are blocked by the `setField` no-op (E5).
- **AC-C9:** under `coaches-error` the coach select and submit are natively disabled, and Enter submits nothing (E3).
- **Accessibility basics:**
  - the mobile table keeps explicit ARIA roles;
  - status badges carry an icon and a text label;
  - focus rings use a 2 px outline with 2 px offset;
  - placeholders use `text-muted`;
  - controls use `border-control`;
  - reduced motion disables the drawer animation and spinners.
- **Security:** there is no `dangerouslySetInnerHTML`, and notes render as text with `pre-wrap`.

## Residual Gaps (not findings; for verification)

- I didn't run the suite or the build for this review (read-only, diff-based). The results are from the coder's report.
- None of the following has been checked in a real browser: the 1440×900 and 390×844 layouts, horizontal overflow, contrast as rendered, Chrome's real non-cancelable `cancel` behavior, and screen-reader announcements (L1–L5). These belong to `browser-verify`. The 100 ms "already handled" window in `Drawer.tsx` is a heuristic that needs observation in Chrome.
- `beforeunload` relies on `preventDefault()` only. Some browsers also expect `returnValue`, which needs a browser check.

## Suggested Follow-up

`debugger` or `coder` for R-1 (should-fix); `test-generator` for R-2 (should-fix); `coder` for R-3 and R-5 to R-9 (low, optional); `ui-designer` or `docs-generator` for R-10. Which to run and in what order is the developer's choice.

---

## Remediation (coder, round 1)

Date 2026-11-04. Base: `2ee0db8`. The developer selected which findings to fix and which to accept (workflow log, `code-reviewer` row). The original findings above are preserved unchanged. This section records what happened to each one. No re-review has been performed. Whether these fixes are acceptable is for a later `code-reviewer` or `verify` run.

| Finding | Severity | Status | What changed / rationale | Evidence |
| --- | --- | --- | --- | --- |
| R-1 | Should-fix | **resolved** | `src/lib/useUrlParam.ts`: `close()` records a pending back traversal per param name (`pendingBack`) and ignores further closes until the next `popstate` releases it. A later open/close cycle still uses `history.back()`. | New regression test `src/test/historyGuard.test.tsx`. It **failed before the fix** (`expected "back" to be called 1 times, but got 2 times`) and passes after it. Note: jsdom merges queued `back()` traversals into one (checked with a plain JSDOM probe), so the test asserts the `history.back()` call count rather than the browser's two-entry jump. The real-browser symptom is still for `browser-verify`. |
| R-2 | Should-fix | **resolved** | AC-C8 behavior tests added (`test-generator` skipped by developer decision). The implementation is unchanged. | `src/test/remediation.test.tsx`: (1) with `status=cancelled` active, create shows "The current filters hide it." and no new row; [Show All Sessions] clears the filter, moves focus to [Open Session] (F28), shows the row with the "New" tag, switches the banner to "It's marked New in the list.", removes [Show All Sessions], and [Open Session] opens the details. (2) When the refetch fails after create, "The list couldn't refresh." appears with the list error alert and [Open Session]. |
| R-3 | Low | **resolved** | `src/lib/useUrlParam.ts` exports `hrefWithParam(name, value)`, which uses the same URL builder as `push()`. `SessionsTable.tsx` row links use it, so the `href` keeps every other param and the hash. | E1 (`src/test/riskBehaviors.test.tsx`) now asserts `href="/?scenario=list-error&x=1&session=ses_101#h"`. |
| R-4 | Low | **accepted limitation** | Developer rationale: this is the AD-4 page-size trade-off. Pagination is an optional extension, so a new session beyond page 1 is treated the same as filtered out, including the copy. No code change. | — |
| R-5 | Low | **resolved** | `SessionsWorkspace.tsx`: the flag became `listCheckSince` (the `list.settled` value when [Check Sessions List] was pressed). The "List updated:" prefix applies only to the next settled run (`settled === since + 1`), so it no longer sticks. | `src/test/remediation.test.tsx` R-5: after a network-failed create, [Check Sessions List] announces "List updated: 5 sessions"; a later filter change announces "1 session" without the prefix. |
| R-6 | Low | **resolved** | `useAsyncResource.ts`: `retry()` sets a `retryRequested` ref. Only a user retry keeps the error visible with `isRetrying`. A key change from the error state (for example a filter change) shows `loading`. | `src/test/remediation.test.tsx` R-6: under `list-error`, changing Status shows "Loading sessions…" and no "Trying again…" button. Pressing [Try Again] still shows `aria-disabled` "Trying again…". |
| R-7 | Low | **resolved** | `CreateSessionDrawer.tsx`: server-mapped field errors live in separate `serverErrors` state. Editing a field clears only that field's server error. Editing date or time clears the Start group's `startsAt` error. A new submit clears them all. Client validation errors are merged with them for display. | E2 extended: after a 400, typing in Title keeps "Unknown coach" and "Bad start". Changing Coach clears "Unknown coach" and `aria-invalid`. Changing Start time clears "Bad start". |
| R-8 | Low | **resolved** | `src/api/types.ts` re-exports `CreateSessionRequest`. `useCreateSession.ts` imports it from `api/types`. | `grep -rn "api/contract" src/features src/app src/lib` → no output, exit 1 (an added check, see the §6 results below). |
| R-9 | Low | **accepted limitation** | Developer rationale: this follows P-3. Mocks are on by default in every mode and no real backend exists, so the always-loaded mock chunk costs nothing in this assessment. No code change. | — |
| R-10 | Info | **accepted limitation** | Developer rationale: this is the developer's recorded decision (workflow log, 2026-11-04 18:09) to follow ui-design §7 over F6. After details opened from the banner are closed, the banner is dismissed and focus follows F5. `ui-design.md` is not amended in this round. | — |

### Checks after remediation

Run from `/home/user/WebstormProjects/training-sessions-workspace` on 2026-11-04 after the changes above:

| Exit | Command |
| --- | --- |
| 0 | `npm run typecheck` |
| 0 | `npm run lint` (0 warnings) |
| 0 | `npm test`: 5 files, 23 tests passed (was 17; +1 R-1, +5 in `remediation.test.tsx`; E1 and E2 extended) |
| 0 | `npm run build` |
| 0 | `grep -rnE "scenario\|fixtures" src/app src/features src/api src/lib ; test $? -eq 1` |
| 0 | `grep -rnE "\bfetch\(" src --include='*.ts' --include='*.tsx' \| grep -v '^src/api/http.ts' ; test $? -eq 1` |
| 0 | `grep -rln "mocks" src/app src/features src/api src/lib ; test $? -eq 1` |
| 0 | `grep -rn "api/contract" src/features src/app src/lib ; test $? -eq 1` (added for R-8; not part of plan §6) |
| 0 | `test -f public/mockServiceWorker.js` |
| 0 | `test -z "$(git status --porcelain frontend-accelerator-assessment)"` |

Still not verified in a browser: the real two-entry history jump (R-1) and everything listed under "Residual Gaps".

---

## Re-review (round 2)

**Updated verdict: PASS.** No blocking or should-fix findings remain. Two new findings (N-1, N-2) are low or info and do not block.

| | |
| --- | --- |
| Reviewer | `code-reviewer` (read-only) |
| Date | 2026-11-04 |
| Range | `HEAD~1..HEAD`: one commit, `4231aac fix(TASK-001): review round 1 findings`, on top of `2ee0db8`. Working tree clean against HEAD. |
| Scope | The fixes for R-1 to R-3 and R-5 to R-8, the accepted-limitation records for R-4, R-9 and R-10, and regressions introduced by this commit. |
| Independent evidence (this review) | `npx vitest run`: exit 0, 5 files, 23 tests passed, no stderr. `npm run typecheck`: exit 0. `npm run lint`: 0 warnings or errors. `grep -rn "api/contract" src/features src/app src/lib`: no output, exit 1. `grep -rnE "scenario\|fixtures" src/app src/features src/api src/lib`: no output, exit 1. I did not re-run the build. That the R-1 test failed before the fix comes from the coder's report; I didn't reproduce it here, because a read-only check-out of the old code would modify the tree. |

### Remediation verification

| Finding | Remediation | Verdict | Notes |
| --- | --- | --- | --- |
| R-1 | `pendingBack` guard in `src/lib/useUrlParam.ts:31-37, 76-81` | **confirmed** | A second `close()` before `popstate` returns early. The guard is released by a one-shot `popstate` listener registered before `history.back()`, so a later open and close works again; the test checks this (second `back` call). The only regression risk would be a missing `popstate` after a same-document `back()`, and none is expected: a cross-document back unloads the module anyway. The test asserts the `history.back()` call count, not the browser's history position, because jsdom merges traversals. The real two-entry jump remains a `browser-verify` item. |
| R-2 | `src/test/remediation.test.tsx` (AC-C8, two tests) | **confirmed** | The tests cover the hidden variant with no new row, [Show All Sessions] (filter reset, F28 focus, row with "New", banner switched to "present", button removed), [Open Session] opening the details, and the refresh-failed variant with the list alert. These are behavior-level assertions on full banner text through `role="status"`. |
| R-3 | `hrefWithParam()` used by `SessionsTable.tsx:51` | **confirmed** | It uses the same URL builder as `push()`, so the encoding is identical and goes through `URLSearchParams`. E1 asserts the exact `href`. The `href` is computed at render from `window.location`, and rows re-render whenever `session` changes, because `SessionsWorkspace` subscribes to it. A hash-only change (skip link) leaves an older hash in hrefs until the next render. That is cosmetic, so not a finding. |
| R-4 | No code change | **accepted limitation (confirmed)** | The developer's rationale is recorded: the AD-4 page-size trade-off, with pagination optional. |
| R-5 | `listCheckSince` + `settled === since + 1` in `SessionsWorkspace.tsx` | **confirmed** | The prefix is now scoped to the run triggered by [Check Sessions List]. The removed reset in `updateFilters` is no longer needed. The test covers both the prefix and its disappearance. |
| R-6 | `retryRequested` ref in `useAsyncResource.ts` | **confirmed** | Only `retry()` keeps the error with `isRetrying`. A key change from the error state shows `loading`. Checked for regressions: details retry (E7), coaches retry (E3, F31) and list retry (T6, F12) still pass. The discoverability phase doesn't depend on `isRetrying` since round 1, because it is `settled`-based. |
| R-7 | Separate `serverErrors` in `CreateSessionDrawer.tsx`, merged at `:259` | **confirmed** | Editing a field clears only its own server error, editing date or time clears the Start group's `startsAt` error, and a new submit clears them all. E2 is extended to cover keep, clear-by-field and clear-by-time. See N-1 for a small leftover. |
| R-8 | `CreateSessionRequest` re-exported from `src/api/types.ts`; `useCreateSession.ts:2` imports it there | **confirmed** | The `api/contract` grep over `src/features src/app src/lib` is now empty, as I checked independently. |
| R-9 | No code change | **accepted limitation (confirmed)** | The developer's rationale is recorded: P-3, mocks on in all modes, no real backend. |
| R-10 | No code change | **accepted limitation (confirmed)** | The developer's decision (§7 over F6) is recorded. `ui-design.md` F6 still states the old rule, which matters for doc readers only. |

### New findings (round 2)

#### N-1 · Low · forms: the form-level message stays after the server field errors are gone

- **Where:** `src/features/sessions/create/CreateSessionDrawer.tsx:160` (set on a 400 with mapped fields). It is cleared only at the next submit (`:137`).
- **Problem:** after R-7, the user can clear every server field error by editing those fields. The form-level box still says "The session wasn't created. Fix the highlighted fields, then submit again.", but nothing is highlighted any more. This is a stale message, not a wrong state. Before R-7 the same staleness existed, and the field errors disappeared even sooner, so this is a leftover rather than a regression.
- **Failure scenario:** after a server 400 with `fieldErrors: { coachId }`, choose another coach. The coach error disappears, but the box still asks to fix highlighted fields.
- **Status:** ~~unresolved~~ → **resolved** (coder, 2026-11-04, after browser-verify; see "N-1 status update" at the end of this file). Original note: optional for `coder`, drop the "highlighted fields" sentence once `serverErrors` is empty and no client errors remain.

#### N-2 · Info · test hygiene: the R-1 spy isn't restored if an assertion fails

- **Where:** `src/test/historyGuard.test.tsx:19, 40`. `vi.spyOn(window.history, 'back')` is restored only on the success path, and `vite.config.ts` doesn't set `restoreMocks`.
- **Problem:** if an assertion fails before line 40, the spy stays on `window.history.back` for the rest of that file. The file has only one test today, so there is no current impact.
- **Status:** accepted limitation (no current effect). An optional hardening for `coder` or `test-generator` is `onTestFinished(() => back.mockRestore())`.

### Pre-existing behavior noticed (not introduced by this commit; not a finding)

If a details close and a new open happen within the same frame (close starts `history.back()`, then a row click calls `pushState` before the traversal lands), the queued traversal goes back to the previously opened session's entry. This existed before round 1. The R-1 guard neither causes nor fixes it, and it needs an unrealistically fast close-then-click. I'm recording it for `browser-verify` awareness only.

### Residual gaps (unchanged)

These still need a real browser (`browser-verify`): the 1440×900 and 390×844 layouts, horizontal overflow, contrast as rendered, Chrome's non-cancelable `cancel` behavior and the 100 ms handled window in `Drawer.tsx`, the real R-1 history jump, screen-reader announcements (L1–L5), and `beforeunload`.

### Suggested follow-up

There are no required code changes. N-1 is an optional `coder` change. `browser-verify` is the remaining evidence gap. Which to run and in what order is the developer's choice.

---

## N-1 status update (coder, after browser-verify)

Date 2026-11-04. N-1 was bundled with browser-verify BV-1 by developer decision. It was implemented according to the ui-design 2026-11-04 amendment ("When the form-level box disappears").

| Finding | Status | Change | Evidence |
| --- | --- | --- | --- |
| N-1 | **resolved** | `src/features/sessions/create/CreateSessionDrawer.tsx`: a box shown for a `400 VALIDATION_FAILED` with mapped server field errors is marked `fieldBased`. Once no server or client field error is highlighted, it is removed, or, when unmapped server messages exist, it keeps them and its message becomes "The session wasn't created. Check the form, then submit again.". Boxes for 500, network, contract, or a 400 without `fieldErrors` aren't affected by field edits. All boxes are still cleared at the next submit and when the drawer closes. | `src/test/formErrorFeedback.test.tsx`, "N-1" block: box removed after the coach error is cleared (an edit to another field keeps it; focus stays on the edited field); unmapped "Odd" kept with "Check the form…" and without "Fix the highlighted fields"; a 500 box survives a field edit. The first two tests **failed before the fix** and pass after it. The third passed before and after, and guards against removing the box too eagerly. |
| N-2 | accepted limitation (unchanged) | — | — |

No re-review of this change has been performed.

