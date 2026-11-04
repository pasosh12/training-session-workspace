# TASK-001 Final Report: Training Sessions Workspace

This report assembles facts already recorded in `tasks/TASK-001/` and `info/workflow-log.md`. It adds no new results. Where a fact isn't recorded, it says **not recorded**. For details, follow the links.

| | |
| --- | --- |
| Task | TASK-001: frontend workspace to find, inspect, and create training sessions against an MSW mock of the fixed API contract ([requirements.md](requirements.md)) |
| Final code commit | `61c8ea2 fix(TASK-001): browser-verify findings BV-1, BV-2, N-1` |
| Final verdicts | `verify` **PASS** ([verification.md](verification.md)) · code review **PASS** (round 3, [review.md](review.md)) · browser **PASS** (re-verification round 2, [browser-verification.md](browser-verification.md)) |
| Workflow evidence | [`info/workflow-log.md`](../../info/workflow-log.md) |

## 1. Scope

### Implemented

Per the requirements ([requirements.md](requirements.md) §4), the plan ([implementation-plan.md](implementation-plan.md)), and verified by tests ([verification.md](verification.md) §2) and the browser ([browser-verification.md](browser-verification.md)):

- **Sessions workspace** (AC-L1–L8):
  - a table with title, type, status, start, duration, coach, location, capacity, and booked count;
  - server-side search and a single-status filter;
  - a clear-filters action;
  - status shown with text plus icon shape;
  - list context preserved because the list stays mounted while details open.
- **Session details** (AC-D1–D7): a native `<dialog>` drawer driven only by `?session=<id>`, with:
  - deep links;
  - "none" fallbacks for empty fields and a cancellation block;
  - a details error with retry, and a not-found state;
  - focus return to the opening row.
- **Create session** (AC-C1–C10):
  - all fields with client validation;
  - server `fieldErrors` mapping;
  - an in-flight guard (one POST per intent);
  - input preserved on failure;
  - a success banner, including the "filters hide it" variant with [Show All Sessions] and [Open Session];
  - coaches-error blocking submit;
  - a discard confirmation for unsaved input;
  - a native-dialog self-close guard (ui-design §4.4.1).
- **Required UI states** (AC-S1–S9) and all six required mock scenarios (`normal`, `empty`, `list-error`, `details-error`, `coaches-error`, `create-error`), selected with `?scenario=` at mock startup (AC-M1–M9).
- **Responsive and accessibility behavior** (AC-R1–R2, AC-A1–A7): checked at 1440×900 and 390×844 in HeadlessChrome 156. Items not verified are listed in §8.

### Missing, not implemented, or not fully verified

- **Optional extensions:** none implemented, by developer approval P-7 ([architecture.md](architecture.md) §10). That covers type filter, URL filter sync, pagination, cancellation, read-only mode, background refresh, tablet verification, optional scenarios, and optimistic updates.
- **Required behavior recorded as missing:** none. Required behavior that is implemented but only partly verified is listed under Known limitations (§8): for example, screen-reader announcements, measured contrast, and reduced motion.
- **AC-L7 scroll position:** assumption A3 treats it as best effort ([requirements.md](requirements.md) §7). A dedicated scroll-position check is **not recorded**.

## 2. Key decisions and amendments

| Area | Decision | Source |
| --- | --- | --- |
| Routing and details | No router. A details overlay whose open state comes only from the `?session=` URL param; other params and the hash are preserved. | AD-1 (+ amendment), P-1, [architecture.md](architecture.md) |
| Server state | No data library. Per-resource hooks with abort, keep-previous-data, and a refetch-after-create membership check. | AD-3, AD-4, P-2 |
| Dates | Parsed to `Date` in the API mappers and shown in local time via `Intl`. Fixture rebasing happens only in mocks. | AD-5 |
| Mock boundary | `src/mocks/` only, with mocks on in all modes (`VITE_API_MOCKING=off` to disable) and the scenario read once from `?scenario=`. | AD-6, P-3, [api-integration.md](api-integration.md) §3 |
| Module boundaries | `app → features → api, lib`. **Amendment 2026-11-04:** domain types moved to `src/api/types.ts`, after the coder stopped at S1 on an AD-7 conflict. | AD-7 (+ amendment) |
| Error model | A single `ApiRequestError` with `http`, `network`, and `contract` kinds; abort errors are rethrown. No contract changes. Clarifications C-1–C-6 recorded. | [api-integration.md](api-integration.md) §2, §9 |
| UI | No sidebar (Q-2) and local create state (Q-1). Contrast fixes X-1–X-6 and 5 added tokens. | [ui-design.md](ui-design.md) §1, §10, §13 |
| UI amendments | §4.4.1 native-dialog self-close guard with F35–F40. **2026-11-04:** F26 now focuses and scrolls to the form error, with N-1 disappearance rules (after BV-1). F6 vs §7: §7 followed, by developer decision (R-10). | [ui-design.md](ui-design.md) §4.4.1, §8 |
| Coder deviations | Form value type lives in `api/` (accepted); tests in `src/test/` because of the scenario grep; `aria-busy` on the results section. | [review.md](review.md) "Coder's Stated Deviations" |

## 3. Dependencies and trade-offs

- **New dependencies:** none. The only dependency setup step was `npx msw init public --save`, which added `public/mockServiceWorker.js` and `msw.workerDirectory` (P-4). `msw@2.14.6` was already present.
- **Configuration changes:** `tsconfig.app.json` gained `"resolveJsonModule": true` only; `include` was unchanged (P-5). The `index.html` title changed. The Vite starter files were removed (P-6).
- **Rejected alternatives:**
  - `react-router` (rejected by P-1);
  - TanStack Query (rejected by P-2);
  - a date library;
  - a schema library.

  Each rationale is in [architecture.md](architecture.md) AD-1, AD-3, AD-5 and [api-integration.md](api-integration.md) §2.5.
- **Accepted trade-offs:**
  - R-4: page-size discoverability;
  - R-9: the mock chunk loads even when mocks are off.

  See §8.

## 4. Review rounds and final finding statuses

Source: [review.md](review.md).

| Round | Range | Verdict | Outcome |
| --- | --- | --- | --- |
| 1 | `c860590..HEAD` (`2ee0db8`) | NEEDS-CHANGES | R-1, R-2 should-fix; R-3 to R-10 low or info |
| Remediation 1 | `4231aac` | (coder) | R-1–R-3, R-5–R-8 fixed; R-4, R-9, R-10 accepted |
| 2 | `HEAD~1..HEAD` (`4231aac`) | PASS | All remediations confirmed; new N-1 (low), N-2 (info) |
| 3 | `HEAD~1..HEAD` (`61c8ea2`) | PASS | BV-1, N-1 confirmed in code; BV-2 plausible; new N-3, N-4 (info) |

Final statuses:

| Status | Findings |
| --- | --- |
| Resolved | R-1, R-2, R-3, R-5, R-6, R-7, R-8, N-1 |
| Accepted limitation | R-4, R-9, R-10, N-2 |
| Open in `review.md`, accepted as limitations by the developer (workflow log 2026-11-04 18:52) | N-3, N-4 |

## 5. Browser verification

Source: [browser-verification.md](browser-verification.md).

| Run | Code | Verdict | Notes |
| --- | --- | --- | --- |
| Round 1 | `4231aac` | **FAIL** | BV-1 (should-fix): create error box scrolled out of view. BV-2 (low): suffixes broke mid-word. All other checks C1–C18 PASS, including Escape ×3, the R-1 double close, and `?scenario=` persistence. |
| Remediation | `61c8ea2` | (coder) | F26 focus and scroll, N-1 rules, suffix CSS |
| Round 2 | `61c8ea2` | **PASS** | BV-1 and BV-2 pass at 1440×900 and 390×844. Regression pass clean (populated list, create success, list-error). |

- **Server:** developer-owned Vite at `http://localhost:5173/` (PID 163062), never started or stopped by a role.
- **Adapter sessions:** `task001-bv-20261104` and `task001-bv-r2-20261104`, both closed.
- The round-2 time stated in `browser-verification.md` ("about 18:53–19:00 CET") is approximate. The workflow log records that run at 18:56 CET.

Evidence screenshots, in [`evidence/`](evidence/):
- [populated-desktop.png](evidence/populated-desktop.png) and [populated-mobile.png](evidence/populated-mobile.png) (required, round 2)
- [create-validation-desktop.png](evidence/create-validation-desktop.png)
- [create-success-desktop.png](evidence/create-success-desktop.png) (round 2)
- [create-hidden-by-filter-desktop.png](evidence/create-hidden-by-filter-desktop.png)
- [details-new-session-desktop.png](evidence/details-new-session-desktop.png)
- [create-escape-x3-desktop.png](evidence/create-escape-x3-desktop.png)
- [create-error-desktop.png](evidence/create-error-desktop.png) and [create-error-mobile.png](evidence/create-error-mobile.png) (round 2; the round-1 FAIL versions are in commit `61c8ea2`)
- [empty-desktop.png](evidence/empty-desktop.png)
- [no-matches-desktop.png](evidence/no-matches-desktop.png)
- [list-error-desktop.png](evidence/list-error-desktop.png) (round 2)
- [details-error-desktop.png](evidence/details-error-desktop.png)
- [details-cancelled-desktop.png](evidence/details-cancelled-desktop.png)
- [coaches-error-desktop.png](evidence/coaches-error-desktop.png)
- [details-mobile.png](evidence/details-mobile.png)

**Manual check by the developer** (workflow log, "Manual Browser Observation"): Chrome desktop. Search and filter, past-date validation, and two successful creates, with banner, "New" tag, and focus as expected. Once, the banner wasn't noticed after the first create; this was not reproducible. Not checked manually: mobile, error scenarios, screen reader, other browsers.

## 6. Verification commands and verdicts

Source: [verification.md](verification.md). Run from `/home/user/WebstormProjects/training-sessions-workspace` at `61c8ea2`. Verdict: **PASS**.

| Command | Exit | Result |
| --- | --- | --- |
| `npm run typecheck` | 0 | no diagnostics |
| `npm run lint` | 0 | no diagnostics |
| `npm test` | 0 | 6 files, 28 tests passed |
| `npm run build` | 0 | built (`dist/` gitignored) |
| scenario/fixtures, `\bfetch\(`, mocks, `api/contract` greps | 1 each (no matches = pass) | 0 matches |
| `test -f public/mockServiceWorker.js` | 0 | present |
| `git status --porcelain frontend-accelerator-assessment` | 0 | unchanged |

Format and e2e checks: not applicable (none configured).

## 7. Assumptions

From [requirements.md](requirements.md) §7:
- **A1:** create opens inside the workspace.
- **A2:** the server's list order is used.
- **A3:** scroll restoration is best effort.
- **A4:** `INVALID_FILTER` is not reachable from the UI.
- **A5:** a start that becomes past at submit fails validation.

Contract interpretations C-1–C-6 (list order, which location fields search covers, what counts as a malformed filter, `fieldErrors` key names, validation depth, generated id and timestamp format): [api-integration.md](api-integration.md) §9. Evaluator confirmation of these: **not recorded**.

## 8. Known limitations

Full list: [verification.md](verification.md) §5 (also summarized in the workflow log, "Completion").

- **R-4:** "The current filters hide it." is also shown when the new session is only off page 1 (AD-4; pagination optional).
- **R-9:** the mock chunk (435 kB) loads even with `VITE_API_MOCKING=off` (P-3).
- **R-10:** `ui-design.md` F6 is not amended; the implementation follows §7.
- **N-2:** the R-1 test spy is restored only on success.
- **N-3, N-4:** a possible double screen-reader announcement of the create error, and a re-announced wording change.
- **Unverified browser behavior:**
  - no screen reader was run, and contrast was not measured with a tool;
  - not tried: reduced motion, `beforeunload`, touch and back gestures, and non-Chrome browsers;
  - BV-1 after a network failure was checked only by a jsdom test;
  - most round-1 browser checks were not repeated after the BV fixes;
  - the console for the round-2 BV-1 segment was not inspected.

## 9. Workflow and developer time

Source: [`info/workflow-log.md`](../../info/workflow-log.md). Times are transcribed from the developer; agents computed only the differences.

| | |
| --- | --- |
| Started / finished | 2026-11-03 20:05 CET / 2026-11-04 19:06 CET |
| Substantial breaks | 2026-11-03 21:00 – 2026-11-04 17:45 CET (20h 45m) |
| Calendar time | 23h 01m |
| Active time | 2h 16m |
| Runtime | Claude Code v2.1.317, model Opus 5.5, Node.js 24.22.2 |
| Doctor | `DEGRADED` (only `hooks:codex` PENDING_ACTIVATION; `claude: ACTIVE`; blocking effect none) |
| Ordering evidence | Pre-coder checkpoints `c89cad2` (requirements, architecture, api-integration, ui-design) and `02ece18` (implementation plan), both before the first production commit `2ee0db8` |
| Role invocations | 20 rows in this order: `requirements-analyst` → `architect` ×2 → `api-integration` → `ui-designer` ×3 → `writing-plans` → `coder` (stopped at S1) → `architect` → `coder` → `code-reviewer` → `coder` → `code-reviewer` → `browser-verify` → `ui-designer` → `coder` → `code-reviewer` → `browser-verify` → `verify`. Every row records STOP observed and the next action selected by the developer. |
| Contextual roles | `brainstorm`, `git-worktrees`, `debugger`, `test-generator`, `reflect`: all skipped, with reasons in the log |

**Gaps in the workflow log:**
- The log records most role times as "time this was logged", not the invocation time. Two `architect` times are developer-stated approximations.
- `EVIDENCE_PROTOCOL.md` §1 lists a `tasks/TASK-001/workflow-log.md`, while §3 requires the log at `info/workflow-log.md`. [`tasks/TASK-001/workflow-log.md`](workflow-log.md) now exists as a pointer to [`info/workflow-log.md`](../../info/workflow-log.md), which holds the full log.

## 10. Reproduction

From [README.md](../../README.md):

```bash
npm install
npm run dev                      # open the printed URL (recorded run: http://localhost:5173/)
# scenarios: /?scenario=normal|empty|list-error|details-error|coaches-error|create-error
# deep link: /?scenario=details-error&session=ses_101
npm test                         # 6 files, 28 tests (at 61c8ea2)
npm run typecheck && npm run lint && npm run build
```

The mock API runs in every mode and its state resets on reload ([README.md](../../README.md), "Run").
