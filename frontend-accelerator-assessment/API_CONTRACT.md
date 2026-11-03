# Frontend Assessment API Contract

This contract is fixed for the assessment. Implement it with `msw@2.14.6` handlers as described in `MOCKING_GUIDE.md`. No backend or direct fixture transport is permitted.

Base path: `/api`

All timestamps crossing the client boundary are ISO 8601 UTC strings. The UI displays them in the user's local timezone.

## Data Types

```ts
type SessionType = "training" | "camp" | "private";
type SessionStatus = "scheduled" | "full" | "cancelled" | "completed";
type Visibility = "public" | "invite-only";

interface CoachSummary {
  id: string;
  name: string;
  email: string;
}

interface LocationSummary {
  name: string;
  address: string;
}

interface SessionSummary {
  id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  bookedCount: number;
  visibility: Visibility;
  coach: CoachSummary;
  location: LocationSummary;
  updatedAt: string;
}

interface SessionDetails extends SessionSummary {
  description: string | null;
  trainerNotes: string | null;
  createdAt: string;
  cancellation: null | {
    reason: string | null;
    cancelledAt: string;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}
```

## GET /api/sessions

Required query parameters:

| Name | Type | Default | Notes |
| --- | --- | --- | --- |
| `query` | string | empty | Searches title, coach name, and location. |
| `status` | SessionStatus | empty | One status in v1. |

Filtering by `type` and implementing pagination are optional extensions. The required response retains `page: 1` and `pageSize: 10` metadata.

Response `200`:

```ts
interface SessionsResponse {
  data: SessionSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

Use `fixtures/sessions.json` as the default response. It contains five records, `page: 1`, `pageSize: 10`, and `total: 5`. MSW handlers must apply `query` and `status` before calculating `meta.total`.

Errors:

- `400 INVALID_FILTER`: malformed query parameter.
- `500 SESSIONS_UNAVAILABLE`: list cannot be loaded.

## GET /api/sessions/:sessionId

Response `200`: `SessionDetails`.

Use the matching `fixtures/session-details/<sessionId>.json` file. Every session in the default list has a corresponding details fixture.

Errors:

- `404 SESSION_NOT_FOUND`: the URL refers to an unknown or deleted session.
- `500 SESSION_DETAILS_UNAVAILABLE`: details cannot be loaded.

## GET /api/coaches

Response `200`:

```ts
interface CoachesResponse {
  data: CoachSummary[];
}
```

Use `fixtures/coaches.json` as the default response.

Errors:

- `500 COACHES_UNAVAILABLE`: coach choices cannot be loaded. The create form must not pretend it can submit a valid coach selection.

## POST /api/sessions

Request:

```ts
interface CreateSessionRequest {
  title: string;
  type: SessionType;
  startsAt: string;
  durationMinutes: number;
  coachId: string;
  locationName: string;
  locationAddress: string;
  capacity: number;
  visibility: Visibility;
  description?: string | null;
  trainerNotes?: string | null;
}
```

Both `locationName` and `locationAddress` are required by the product specification and this contract.

Response `201`: `SessionDetails` with generated identifiers and timestamps. The successful mock response must echo the normalized submitted values, use the selected coach from the coaches fixture, and become available through both list and details reads.

Required errors:

- `400 VALIDATION_FAILED`: includes `fieldErrors` where available.
- `500 CREATE_SESSION_FAILED`: unexpected failure.

Optional error: `409 COACH_SCHEDULE_CONFLICT` when another session overlaps for the selected coach.

The client must prevent accidental duplicate submissions but must not manufacture idempotency guarantees that the contract does not provide.

## Optional: POST /api/sessions/:sessionId/cancel

Request:

```ts
interface CancelSessionRequest {
  reason?: string | null;
}
```

Response `200`: updated `SessionDetails` with `status: "cancelled"` and a populated `cancellation` object. The corresponding list summary must also expose the new status.

Errors:

- `403 SESSION_CANCEL_FORBIDDEN`: current user has read-only access.
- `404 SESSION_NOT_FOUND`: session no longer exists.
- `409 SESSION_STATE_CHANGED`: session was already cancelled or completed; refresh details from the server.
- `500 CANCEL_SESSION_FAILED`: unexpected failure.

## Optional Permission Input

Authentication is out of scope. An implementation that includes optional cancellation or read-only behavior may provide one current permission:

```ts
type SessionPermission = "manage" | "read-only";
```

`manage` exposes create and eligible cancellation actions. `read-only` does not render enabled mutation controls. Client-side hiding is a UX behavior, not a claim of backend authorization.

Permission injection belongs at the mock/application boundary. It is not a new backend endpoint.

## Deterministic Mock Scenarios

The required scenarios are `normal`, `empty`, `list-error`, `details-error`, `coaches-error`, and `create-error`.

The supplied `create-conflict`, `cancel-forbidden`, `cancel-conflict`, `read-only`, `slow-refresh`, and `unknown-session` scenarios are optional extensions.

The candidate chooses how to select scenarios. Scenario selection is assessment infrastructure, not part of the external API contract. Presentation components consume ordinary success or error results and must not branch on scenario names. See `MOCKING_GUIDE.md` for the complete mock boundary requirements.

## Fixture Clock

`fixtures/fixture-clock.json` contains the reference instant used by all supplied timestamps. At mock startup:

1. read `referenceNow`;
2. compute the difference between the actual current instant and the reference instant;
3. shift every fixture `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt` value by that difference;
4. expose the shifted value as a normal ISO 8601 UTC string.

This transformation occurs only in the MSW boundary. Production-facing types and presentation components remain unaware of it. Tests should freeze time and use the same transformation.

## Contract Authority

The candidate may add local view models and normalization functions. Changing endpoint paths, required request fields, response fields, or error codes requires an explicit proposal in task documentation and evaluator approval. Do not silently adapt the contract to simplify implementation.
