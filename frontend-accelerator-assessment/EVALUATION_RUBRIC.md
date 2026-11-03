# Frontend Accelerator Assessment Evaluation Rubric

Maximum score: 100 points.

A passing result requires all of the following:

- at least 75 total points;
- no assessment blocker;
- Product Behavior: at least 18/25;
- Frontend Architecture and API Boundary: at least 8/15;
- UI, Responsive Behavior, and Accessibility: at least 12/20;
- Tests and Verification: at least 12/20;
- Accelerator Workflow Evidence: at least 7/10.

Section minimums prevent optional strength in one area from compensating for missing required product behavior, verification, or accelerator usage.

## Assessment Blockers

Any blocker prevents a passing result until resolved:

- accelerator Doctor is `BLOCKED` for the assessed runtime, or required setup evidence is absent;
- the primary sessions workspace cannot be started or reproduced;
- a backend service, direct fixture imports, or a non-MSW transport is submitted instead of the required mock API boundary;
- the required create flow is absent;
- the interface is unusable by keyboard;
- the required automated tests are absent, not runnable, or have hidden failures;
- required real-browser evidence is absent or was not produced through the configured accelerator browser flow;
- no credible workflow evidence shows manual role selection and the command -> isolated agent -> skill -> STOP boundary;
- checks, screenshots, browser observations, or agent evidence are reported but were not actually produced;
- secrets or real personal data are committed;
- assessment inputs or accelerator files are deliberately changed to bypass requirements.

An explicitly reported incomplete behavior is scored as missing but is not dishonesty. Fabricated or concealed evidence is a blocker.

## Scoring

### 1. Product Behavior: 25 points

- 9: sessions list, search, status filter, clear action, and list context work.
- 6: details preserve list context and handle failed session requests.
- 10: create flow validates every specified field, handles pending/success/failure, preserves failed input, and keeps the new session discoverable.

### 2. Frontend Architecture And API Boundary: 15 points

- 5: components, feature logic, and transport responsibilities have clear boundaries.
- 4: MSW can be replaced by a real backend without rewriting presentation components.
- 3: server/request state has a deliberate owner and avoids duplicated sources of truth.
- 3: date, error, and mock-scenario normalization occur at deliberate boundaries.

### 3. UI, Responsive Behavior, And Accessibility: 20 points

- 5: information hierarchy supports fast operational scanning and clear primary actions.
- 4: desktop and mobile layouts remain coherent without overlap, page-level horizontal scrolling, or unreachable actions.
- 2: all flows are keyboard operable with visible focus.
- 2: controls, headings, validation messages, and errors have correct semantics and programmatic associations.
- 2: mutation and status feedback is announced appropriately.
- 3: loading, empty, error, success, and status states are understandable without relying on color alone.
- 2: contrast, reduced motion, tokens, and visual consistency follow the supplied direction.

### 4. Tests And Verification: 20 points

- 8: automated tests cover search/status filtering, create validation and success, create failure preservation, and representative loading/empty/error states.
- 4: tests assert user-observable outcomes instead of fragile implementation details.
- 4: real-browser evidence demonstrates required primary/recovery flows at desktop and mobile viewports.
- 4: final verification accurately reports commands, exit results, console/page/network observations, and unverified gaps.

### 5. Engineering Quality: 10 points

- 3: TypeScript types model domain and UI states without broad unsafe escapes.
- 2: loading, refresh, and mutation races do not produce contradictory UI.
- 2: existing package, formatting, lint, test, and architecture conventions are preserved.
- 2: naming and component APIs are clear and proportionate.
- 1: dependencies, limitations, and trade-offs are documented.

### 6. Accelerator Workflow Evidence: 10 points

- 3: requirements and independently verifiable acceptance criteria were materialized before production implementation.
- 2: architecture, API, and UI decisions are explicit where needed.
- 2: the implementation plan is file-level, ordered, and test-aware.
- 2: review findings, remediation, browser evidence, and final verification are recorded honestly.
- 1: agents STOPped after their own role and the developer selected every subsequent command manually.

The evaluator uses `EVIDENCE_PROTOCOL.md` to determine whether workflow ordering and STOP behavior are sufficiently evidenced. Repository artifacts alone are not proof of their creation order.

## Score Interpretation

- 90-100: strong production-ready frontend reasoning and disciplined accelerator use.
- 75-89: solid result with bounded issues while meeting every section minimum.
- 60-74: meaningful implementation, but one or more important competency or evidence gaps remain.
- below 60: required frontend competence and accelerator readiness are not demonstrated.

Optional extensions are reviewed only after required behavior. They may inform qualitative feedback but do not add points beyond 100.

Reported completion time is informational and does not change the score.
