# Frontend Accelerator Assessment Evidence Protocol

This protocol makes accelerator usage and verification reproducible without assigning an identifier to the assessment itself and without asking read-only quality roles to edit production code or improve their own verdicts.

## 1. Candidate Task Workspace

The first `requirements-analyst` invocation creates or selects the next unused task workspace and reports its `TASK-NNN` identifier. In this document, `<reported-task-id>` means that exact runtime-reported identifier.

The submitted assessment project must contain:

```text
tasks/<reported-task-id>/
|-- requirements.md
|-- architecture.md
|-- api-integration.md
|-- ui-design.md
|-- implementation-plan.md
|-- workflow-log.md
|-- review.md
|-- browser-verification.md
|-- verification.md
|-- final-report.md
`-- evidence/
    |-- populated-desktop.png
    |-- populated-mobile.png
    `-- additional-flow-screenshots.*
```

The generated `TASK-NNN` identifies the candidate's temporary work context only. It is not the identifier of the assessment package.

A role response may be persisted verbatim by the developer or evaluator. After successful applicable verification, `docs-generator` may assemble already-produced facts into `final-report.md`. It must not invent commands, screenshots, observations, or passing results.

## 2. Pre-Implementation Ordering Evidence

Requirements, specialist decisions, and the implementation plan must exist before `coder` begins production implementation.

Provide at least one credible ordering source:

- an evaluator-observed or exported runtime transcript with timestamps; or
- a local Git checkpoint created after planning and before `coder`, with its commit hash recorded in `../../info/workflow-log.md`; or
- equivalent runtime-native session history that clearly shows planning outputs preceding production edits.

A final repository tree by itself does not prove creation order.

## 3. Workflow Log

`../../info/workflow-log.md` must record:

- the reported candidate task identifier;
- assessment project starting commit;
- developer-recorded start, finish, substantial breaks, active time, and calendar time;
- confirmation that agents transcribed rather than inferred those time values;
- runtime and accelerator version or source revision;
- install and setup method;
- Doctor top-level result and assessed runtime hook status;
- every invoked role in order;
- the task given to the role;
- the corresponding artifact or preserved response;
- whether the role STOPped;
- the next command selected manually by the developer;
- a short reason for every contextual role that was skipped or invoked.

Recommended table:

| Time | Role | Input summary | Output/evidence | STOP observed | Developer-selected next action |
| --- | --- | --- | --- | --- | --- |

Automatic chaining of the next role does not satisfy the workflow requirement.

## 4. Review Evidence

`review.md` must preserve the actual `code-reviewer` verdict and findings.

For every actionable finding, record one of:

- resolved, with the implementation or test change identified;
- accepted limitation, with rationale and impact;
- disputed, with evidence;
- unresolved.

If production code changed after review, record the subsequent `coder` or `debugger` invocation and whether another review or verification was performed.

## 5. Automated Test Evidence

`verification.md` or `final-report.md` must contain:

- every test, typecheck, lint, format, and build command actually run;
- working directory;
- exit code or verdict;
- concise decisive output;
- failing, blocked, skipped, or not-applicable checks;
- final Git status/diff scope observed by `verify`.

Do not replace command evidence with “all checks pass”.

## 6. Required Browser Matrix

`browser-verification.md` must record the actual discovered URL, adapter session name, interaction steps, verdict, and server ownership.

Minimum evidence:

| State or flow | Required browser evidence |
| --- | --- |
| Populated workspace | 1440 x 900 screenshot and accessibility snapshot |
| Populated workspace | 390 x 844 screenshot, keyboard/touch reachability, and overflow check |
| Create | validation, pending prevention, success, and discoverability |
| Create failure | preserved input and useful recovery |
| Empty and no matches | distinct messages and recovery |
| Request error | useful error and retry/recovery for the list and one details or coaches failure |

The browser report must also include:

- console output checked;
- page errors checked;
- relevant network requests and failed statuses checked;
- unexpected navigation or uncaught errors;
- unverified browser behavior named explicitly;
- confirmation that only the adapter session and server started by the role were closed.

Screenshots support the verdict but do not replace interaction, accessibility, console, error, or network observations.

## 7. Deterministic Scenario Evidence

Record how each required scenario from `MOCKING_GUIDE.md` was selected and the resulting URL or mock configuration. Record optional scenarios only when implemented.

Scenario controls are assessment infrastructure. They must not be presented as end-user product features and must not be implemented as transport-condition branches inside presentation components.

## 8. Final Report

`final-report.md` must summarize only verified facts:

- implemented scope;
- missing required behavior;
- architecture/API/UI decisions;
- commands and verdicts;
- browser verdict and evidence locations;
- known limitations;
- assumptions;
- new dependencies and trade-offs;
- unresolved review findings;
- developer-reported active and calendar time;
- evaluator reproduction steps.

The final report must link to the detailed artifacts instead of duplicating large transcripts.

## 9. Evidence Integrity

The evaluator should compare the workflow log, runtime transcript or checkpoint, screenshots, command output, and final diff.

Fabricated evidence, concealed failures, or claims of unperformed checks are assessment blockers. Honest incompleteness loses only the relevant points unless it triggers another blocker.
