// The only module that imports the assessment fixture JSON (api-integration §5.1).
// Fixtures are trusted static assessment data; they are typed against the contract here.
import type { CoachSummary, SessionDetails, SessionsResponse } from '../api/contract'
import coachesJson from '../../frontend-accelerator-assessment/fixtures/coaches.json'
import fixtureClockJson from '../../frontend-accelerator-assessment/fixtures/fixture-clock.json'
import mockScenariosJson from '../../frontend-accelerator-assessment/fixtures/mock-scenarios.json'
import sessionsJson from '../../frontend-accelerator-assessment/fixtures/sessions.json'

const detailModules = import.meta.glob<SessionDetails>(
  '../../frontend-accelerator-assessment/fixtures/session-details/*.json',
  { eager: true, import: 'default' },
)

export interface ScenarioEntry {
  description?: string
  request?: string
  status?: number
  body?: unknown
  defaultLatencyMs?: number
  latencyMs?: number
  targetSessionId?: string
}

export interface RawFixtures {
  sessions: SessionsResponse
  details: SessionDetails[]
  coaches: CoachSummary[]
}

export const fixtureClock = fixtureClockJson as { referenceNow: string; timestampFields: string[] }

export const scenarioEntries = mockScenariosJson as Record<string, ScenarioEntry>

export const rawFixtures: RawFixtures = {
  sessions: sessionsJson as SessionsResponse,
  details: Object.values(detailModules),
  coaches: (coachesJson as { data: CoachSummary[] }).data,
}
