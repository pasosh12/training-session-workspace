import { fixtureClock, type RawFixtures } from './fixtures'

/**
 * Shifts every fixture timestamp by (now − referenceNow) so relative ordering is preserved
 * (FRONTEND_ASSESSMENT_SPEC "Fixture Clock Policy"). Pure: returns deep copies.
 */
export function rebaseFixtures(
  fixtures: RawFixtures,
  now: Date,
  referenceNow: string = fixtureClock.referenceNow,
  timestampFields: readonly string[] = fixtureClock.timestampFields,
): RawFixtures {
  const offsetMs = now.getTime() - Date.parse(referenceNow)
  const fields = new Set(timestampFields)
  return shift(fixtures, offsetMs, fields)
}

function shift<T>(value: T, offsetMs: number, fields: Set<string>): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => shift(item, offsetMs, fields)) as T
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      if (fields.has(key) && typeof entry === 'string') {
        result[key] = new Date(Date.parse(entry) + offsetMs).toISOString()
      } else {
        result[key] = shift(entry, offsetMs, fields)
      }
    }
    return result as T
  }
  return value
}
