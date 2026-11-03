---
name: workflow-log
description: "Record the latest accelerator role invocation, or a developer-stated fact, in info/workflow-log.md. Developer-invoked bookkeeping only; never starts or continues a role."
disable-model-invocation: true
argument-hint: "[decision: accept|clarify|correct] [next: <role or action>] [note or developer-stated fact]"
---

# Workflow Log

## Purpose

Keep `info/workflow-log.md` complete and truthful as required by `frontend-accelerator-assessment/EVIDENCE_PROTOCOL.md` section 3, so the developer does not have to hand-write each row.

This skill is bookkeeping. It is not an accelerator role and does not count as one in the role sequence.

## Inputs

- `$ARGUMENTS`: optional developer decision, selected next action, and free-form notes or facts (for example `decision: accept next: architect`, or `start: 2026-11-03 10:00 CET`).
- The current conversation: the most recent accelerator role invocation (`/<role> ...` or an equivalent request), its response, and any artifacts it wrote.

## Procedure

1. Read `info/workflow-log.md`. If it is missing, stop and report that; do not recreate it from memory.
2. Identify what to record:
   - **Role row**: the most recent accelerator role invocation that does not have a row yet. If there are several unrecorded invocations, add them in order.
   - **Developer fact**: start/finish/breaks, Doctor result, hook status, checkpoint commit, manual browser observation, contextual-role reason, or known limitation stated in `$ARGUMENTS` or the developer's messages.
3. For a role row, fill every column:
   - **Time**: the invocation time if the conversation shows it; otherwise run `date '+%Y-%m-%d %H:%M %Z'` and use the current time. Never guess.
   - **Role**: the accelerator role name in backticks.
   - **Exact prompt used**: the developer's prompt copied verbatim, including typos and the slash command. If the developer gave a broader instruction that triggered several roles, quote that instruction and say which part applied to this row. Escape `|` as `\|` so the table does not break.
   - **Output/evidence**: one to three sentences with artifact paths (`tasks/<id>/...`), verdicts, finding IDs, test/check counts and exit codes **as reported by the role**. Do not upgrade or soften verdicts.
   - **STOP observed**: `yes` only if the role ended its turn without invoking another role; otherwise `no` with what happened.
   - **Developer decision**: from `$ARGUMENTS` (`accept`, `clarify`, or `correct`). If not given, write `pending`.
   - **Developer-selected next action**: from `$ARGUMENTS`. If not given, write `pending`. Never fill in the role's own recommendation as the developer's choice.
4. If a previous row still says `pending` and the developer has now stated the decision or next action, update that row.
5. Once the first `requirements-analyst` run has reported the task identifier, replace `<reported-task-id>` at the top of the file.
6. Update other sections only with facts that the developer stated or that commands prove:
   - Time values: transcribe only. Compute active or calendar time only from recorded values and show the arithmetic.
   - Commit hashes: take them from `git log -1 --format='%H %s'` or `git rev-parse`.
   - Doctor and hook status: take them from actual `node ./toolchain/bin/doctor.mjs --json` output.
7. Keep existing rows unchanged except to resolve `pending` cells or correct a factual error that the developer pointed out.
8. Report the rows and fields you changed in a few lines, then STOP.

## Boundaries

- Do not invoke, continue, or recommend running any accelerator role.
- Do not edit production code, tests, configuration, `frontend-accelerator-assessment/`, or any `tasks/` artifact.
- Do not copy full role responses into the log.
- Do not invent timestamps, durations, commands, results, decisions, or observations. Leave an explicit `pending` or `not recorded` instead.
