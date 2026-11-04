import { scenarioEntries } from './fixtures'

export const SCENARIO_NAMES = [
  'normal',
  'empty',
  'list-error',
  'details-error',
  'coaches-error',
  'create-error',
] as const

export type ScenarioName = (typeof SCENARIO_NAMES)[number]

function isScenarioName(value: string): value is ScenarioName {
  return (SCENARIO_NAMES as readonly string[]).includes(value)
}

/** Reads `?scenario=` once at mock startup (api-integration §3.1). */
export function resolveScenario(search: string): ScenarioName {
  const requested = new URLSearchParams(search).get('scenario')
  if (requested === null || requested === '') return 'normal'
  if (isScenarioName(requested)) return requested
  console.warn(`[mocks] unknown or unsupported scenario "${requested}", using "normal"`)
  return 'normal'
}

export function defaultLatencyMs(): number {
  return scenarioEntries.normal?.defaultLatencyMs ?? 0
}

export interface ScenarioOverride {
  status: number
  body: unknown
}

/**
 * Returns the verbatim error response from mock-scenarios.json when the active scenario
 * targets this request (api-integration §4). `empty` is implemented as an empty seed instead.
 */
export function getScenarioOverride(
  scenario: ScenarioName,
  method: string,
  pathname: string,
): ScenarioOverride | null {
  const entry = scenarioEntries[scenario]
  if (entry?.request === undefined || entry.status === undefined || entry.status < 400) return null
  const [entryMethod, entryPath] = entry.request.split(' ')
  if (entryMethod !== method.toUpperCase() || entryPath !== pathname) return null
  return { status: entry.status, body: entry.body }
}
