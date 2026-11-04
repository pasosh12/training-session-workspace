# Training Sessions Workspace

A frontend workspace where a training-business operator can find, inspect, and create scheduled training sessions. The app runs against a mocked API built with [Mock Service Worker](https://mswjs.io/) (`msw@2.14.6`). There is no backend.

## Prerequisites

- Node.js 24 and npm
- No network access is needed after `npm install`.

## Run

```bash
npm install
npm run dev        # Vite dev server; open the printed URL
```

To run the production build locally:

```bash
npm run build
npm run preview
```

The mock API runs in **every** mode, including dev, build, and preview, because no backend exists. Its state is held in memory, so it resets on every page reload. Fixture timestamps are shifted to the current time when the mock starts.

## Mock scenarios

Add `?scenario=<name>` to the page URL. The scenario is read once when the mock starts, so a reload or a new URL is needed to switch.

| URL | Behavior |
| --- | --- |
| `/?scenario=normal` (default) | Default fixtures; create works and persists in memory |
| `/?scenario=empty` | No sessions exist yet; create still works |
| `/?scenario=list-error` | `GET /api/sessions` fails with `500 SESSIONS_UNAVAILABLE` |
| `/?scenario=details-error` | `GET /api/sessions/ses_101` fails with `500 SESSION_DETAILS_UNAVAILABLE` |
| `/?scenario=coaches-error` | `GET /api/coaches` fails with `500 COACHES_UNAVAILABLE` |
| `/?scenario=create-error` | `POST /api/sessions` fails with `500 CREATE_SESSION_FAILED` |

You can combine a scenario with a details deep link, for example `/?scenario=details-error&session=ses_101`. An unknown scenario name falls back to `normal` and logs a console warning.

## Environment variables

| Variable | Default | Effect |
| --- | --- | --- |
| `VITE_API_MOCKING` | (unset) | Set to `off` to disable MSW, for example to use a real backend |
| `VITE_API_BASE_URL` | `/api` | Base path for API requests |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm test` | Run the Vitest suite once (jsdom + MSW node server) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | `oxlint` |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build |

## Project layout

- `src/app/`: app shell and error boundary
- `src/features/sessions/`: the sessions workspace (list, filters, details drawer, create drawer)
- `src/api/`: the API client (the only `fetch` call), contract types, domain types, and mappers
- `src/lib/`: date formatting, the URL-parameter hook, and debounce
- `src/mocks/`: MSW handlers, the in-memory store, the fixture clock, and scenario selection
- `src/test/`: test setup and tests

Task documentation lives in `tasks/TASK-001/`.
