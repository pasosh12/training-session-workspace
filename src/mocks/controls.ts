// Mock state controls. Imported only by src/mocks/browser.ts and src/test/** (api-integration §3.4).
import { rebaseFixtures } from './clock'
import { rawFixtures } from './fixtures'
import { defaultLatencyMs, type ScenarioName } from './scenarios'
import { createStore, type MockStore } from './store'

interface MockState {
  store: MockStore
  scenario: ScenarioName
  latencyMs: number
}

let state: MockState | null = null

export function resetMockState(options: {
  now: Date
  scenario?: ScenarioName
  latencyMs?: number
}): void {
  const scenario = options.scenario ?? 'normal'
  const fixtures = rebaseFixtures(rawFixtures, options.now)
  state = {
    scenario,
    latencyMs: options.latencyMs ?? defaultLatencyMs(),
    store: createStore({
      details: fixtures.details,
      order: fixtures.sessions.data.map((s) => s.id),
      coaches: fixtures.coaches,
      seed: scenario === 'empty' ? 'empty' : 'fixtures',
    }),
  }
}

export function getMockState(): MockState {
  if (state === null) {
    throw new Error('[mocks] resetMockState() must run before handling requests')
  }
  return state
}
