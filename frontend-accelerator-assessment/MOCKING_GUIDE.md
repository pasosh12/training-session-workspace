# Assessment Mock API Guide

The assessment provides a fixed API contract and deterministic JSON fixtures. It does not provide a running mock API, request handlers, or a mock transport. The developer must implement and connect that boundary.

## Required Tool

Use Mock Service Worker 2.14.6:

```bash
npm install --save-dev msw@2.14.6
npx msw init public --save
```

The completed application must make ordinary HTTP requests to the paths in `API_CONTRACT.md`. Application components and the API client must not import fixture JSON directly or branch on mock-scenario names.

## Provided Inputs

- `fixtures/sessions.json`: default sessions list;
- `fixtures/session-details/*.json`: matching session details;
- `fixtures/coaches.json`: coach choices;
- `fixtures/mock-scenarios.json`: deterministic success and failure scenarios;
- `fixtures/fixture-clock.json`: reference instant for rebasing timestamps.

## Required Endpoints

| Method | Path | Required behavior |
| --- | --- | --- |
| `GET` | `/api/sessions` | Return the list and apply `query` and `status` in the handler. |
| `GET` | `/api/sessions/:sessionId` | Return matching details or the contracted error. |
| `GET` | `/api/coaches` | Return coach choices or the contracted error. |
| `POST` | `/api/sessions` | Validate the request, create a session, and return `201`. |

`POST /api/sessions/:sessionId/cancel` is an optional extension.

## Required Behavior

### Search And Status Filter

`GET /api/sessions` applies search and filtering before returning the response:

- `query` searches session title, coach name, and location without case sensitivity;
- `status` uses an exact supported status value;
- `meta.total` reflects the filtered result.

Client-side filtering of the complete fixture list does not satisfy this requirement.

### Stateful Create

After a successful `POST /api/sessions`:

- return `201` with a generated identifier and timestamps;
- use the selected coach from `coaches.json`;
- expose the created session through subsequent list and details requests;
- keep state in memory only; restarting the application may reset it.

The handler validates required fields, `coachId`, positive duration and capacity, supported enum values, and a valid ISO timestamp. Contract validation failures return `400 VALIDATION_FAILED` with `fieldErrors` where applicable.

### Fixture Clock

At mock startup, read `referenceNow` from `fixtures/fixture-clock.json`. Compute the difference between the actual current instant and `referenceNow`, then shift every fixture `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt` by the same amount. This keeps past and future relationships stable when the assessment is completed later.

Fixture rebasing belongs only to the mock boundary. The API client and presentation components receive ordinary ISO 8601 UTC strings.

## Required Scenarios

The mock boundary must support these entries from `fixtures/mock-scenarios.json`:

- `normal`;
- `empty`;
- `list-error`;
- `details-error`;
- `coaches-error`;
- `create-error`.

The mechanism used to select a scenario is an implementation decision. Scenario selection must remain outside presentation components.

The following supplied scenarios are optional extensions: `create-conflict`, `cancel-forbidden`, `cancel-conflict`, `read-only`, `slow-refresh`, and `unknown-session`.

## Completion Check

The mock API is ready when:

- the application runs without a real backend or network access;
- all required application requests use the contracted `/api` paths;
