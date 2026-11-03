# Frontend Accelerator Advanced / Production Assessment

> **Not part of Basic Accelerator Onboarding.** Use this package only when a mentor explicitly assigns the advanced assessment. New users should return to the source toolset's training index and select Basic Accelerator Onboarding.

This directory is a self-contained practical assessment of a developer's ability to use the Frontend Accelerator Toolset to build a new React, TypeScript, and Vite application.

The assessment has no `TASK-NNN` identifier of its own. The developer copies this entire directory unchanged into the new assessment project as `frontend-accelerator-assessment/`. During the assessment, `requirements-analyst` may assign the next unused `TASK-NNN` identifier for the candidate's temporary task workspace. That generated workspace belongs to the candidate's assessment run; it is not the identity of this assessment package.

## Goal

Build a production-minded Training Sessions Workspace as one complete frontend vertical slice while demonstrating the accelerator's manual command -> isolated agent -> skill -> STOP workflow.

The assessment evaluates whether a developer can:

- turn a product brief into explicit frontend requirements;
- make proportionate architecture and UI decisions;
- isolate an API integration boundary without implementing a backend;
- implement responsive and accessible user flows;
- handle loading, empty, error, validation, and mutation states;
- test important behavior and provide real-browser evidence;
- use the accelerator manually, preserve role boundaries, and record honest evidence.

## Assessment Package

Copy this complete directory into the assessment project. It contains:

- `README.md`: starting conditions, manual workflow, and submission overview.
- `FRONTEND_ASSESSMENT_SPEC.md`: scope, acceptance criteria, constraints, and completion rules.
- `API_CONTRACT.md`: fixed frontend-facing endpoint and data contract.
- `MOCKING_GUIDE.md`: required MSW setup outcomes and mock behavior.
- `EVALUATION_RUBRIC.md`: visible scoring, section minimums, and assessment blockers.
- `EVIDENCE_PROTOCOL.md`: required workflow and verification evidence.
- `designs/DESIGN_TOKENS.md`: supplied fallback visual tokens.
- `designs/sessions-dashboard-reference.svg`: information hierarchy reference, not a pixel-perfect mandate.
- `fixtures/*.json` and `fixtures/session-details/*.json`: deterministic mock inputs used by the developer's MSW handlers.

Keep the directory name lowercase and unchanged: `frontend-accelerator-assessment/`.

## Starting Conditions

The developer must:

- use Node.js 24 or newer, npm, and Git;
- create a new clean project with React 19, TypeScript 5.9 or newer, and Vite 7 or newer;
- install and set up the cloned Frontend Accelerator Toolset in that project;
- run Runtime Doctor and record its result and hook status;
- copy this assessment directory unchanged into the project root;
- record the starting commit before implementing the assessed application;
- install `msw@2.14.6` and implement the mock API described in `MOCKING_GUIDE.md`.

Do not implement the assessment inside the Frontend Accelerator Toolset source repository. The assessment directory is read-only input; application code and generated task artifacts belong outside it.

For a local accelerator checkout, the supported lifecycle is:

```powershell
npx --package "<path-to-frontend-accelerator-toolset>" frontend-accelerator install
npx --package "<path-to-frontend-accelerator-toolset>" frontend-accelerator setup
node ./toolchain/bin/doctor.mjs --json
```

The assessment has no time limit. The developer records the actual start, finish, and substantial breaks. Reported active and calendar time are informational and do not directly affect the score.

React is the required Framework Ruleset for this assessment.

## Required Manual Flow

Every phase is selected by the developer. Each agent performs its own skill, reports evidence, and STOPs. It may recommend a next command but must never start it automatically.

```text
requirements-analyst
-> architect
-> api-integration
-> ui-designer
-> writing-plans
-> coder
-> code-reviewer
-> coder or debugger, when review exposes a production issue
-> test-generator, when risk coverage still has gaps
-> browser-verify
-> verify
-> docs-generator, to assemble already-produced evidence into the final report
```

The first role creates or selects the candidate's temporary task workspace and reports its identifier:

```text
/requirements-analyst Read frontend-accelerator-assessment/FRONTEND_ASSESSMENT_SPEC.md, create requirements in the next unused task workspace, and report the assigned task identifier.
```

Use that reported identifier in every later command. In the examples below it is written as `<reported-task-id>`:

```text
/architect Resolve only the frontend architecture decisions required by <reported-task-id> and record them in tasks/<reported-task-id>/architecture.md.
/api-integration Define the frontend client boundary from frontend-accelerator-assessment/API_CONTRACT.md and MOCKING_GUIDE.md, then provide a state/error matrix for tasks/<reported-task-id>/api-integration.md.
/ui-designer Define and record the responsive interaction model using frontend-accelerator-assessment/designs as reference.
/writing-plans Produce the file-level, test-aware implementation plan for <reported-task-id>.
/coder Implement the approved <reported-task-id> scope and essential behavior tests.
/code-reviewer Review the completed <reported-task-id> diff against the approved requirements.
/browser-verify Verify the required flows at the discovered application URL and capture the required screenshots.
/verify Run the relevant existing checks and report the final verdict.
/docs-generator Assemble only the actual review, browser, and verification evidence into tasks/<reported-task-id>/final-report.md.
```

Codex uses the same role and skill names. Invocation syntax may differ by installed runtime, but the role boundary and STOP contract do not.

`brainstorm`, `git-worktrees`, `debugger`, `test-generator`, and `reflect` are contextual. Skipping one does not reduce the score when the developer records a reasonable explanation. `docs-generator` is included only to persist evidence already produced by read-only quality roles; it must not invent or improve their verdicts.

## Submission

The completed assessment project must contain:

- the working frontend implementation;
- the candidate task workspace reported by `requirements-analyst`;
- all artifacts and workflow evidence described in `frontend-accelerator-assessment/EVIDENCE_PROTOCOL.md`;
- focused automated tests;
- desktop and mobile browser evidence required by the specification;
- the commands and checks actually run;
- a short list of known limitations and deliberate trade-offs.

No release, deployment, pull request, backend service, or public URL is required.
