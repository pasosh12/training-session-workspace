// All date formatting goes through Intl without an explicit timeZone, so values render in the
// user's local timezone and locale (architecture AD-5).

const listFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const detailsDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const detailsTimeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
})

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** e.g. "Mon, Aug 3, 18:00" (locale-dependent). */
export function formatListDateTime(date: Date): string {
  return listFormat.format(date)
}

/** e.g. "Monday, August 3, 2026, 18:00 – 19:30 CEST" (locale-dependent). */
export function formatDetailsRange(start: Date, durationMinutes: number): string {
  const end = addMinutes(start, durationMinutes)
  return `${detailsDateFormat.format(start)}, ${detailsTimeFormat.formatRange(start, end)}`
}

export function formatTimestamp(date: Date): string {
  return timestampFormat.format(date)
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

/**
 * Combines a local `YYYY-MM-DD` date and `HH:mm` time into a Date in the user's timezone.
 * Returns null for malformed or impossible values (for example 2026-02-30).
 */
export function localDateTimeToDate(date: string, time: string): Date | null {
  const d = DATE_PATTERN.exec(date)
  const t = TIME_PATTERN.exec(time)
  if (!d || !t) return null
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])]
  const [hours, minutes] = [Number(t[1]), Number(t[2])]
  if (hours > 23 || minutes > 59) return null
  const result = new Date(year, month - 1, day, hours, minutes)
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    return null
  }
  return result
}
