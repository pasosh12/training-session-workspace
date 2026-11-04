import { localDateTimeToDate } from '../../../lib/datetime'
import { SESSION_TYPES, VISIBILITIES } from '../model'
import type { CreateSessionFormValues, FieldName } from './formValues'

export type FieldErrors = Partial<Record<FieldName, string>>

export const TRAINER_NOTES_MAX = 500

const WHOLE_NUMBER = /^\d+$/

function lengthBetween(value: string, min: number, max: number): boolean {
  const length = value.trim().length
  return length >= min && length <= max
}

function intBetween(value: string, min: number, max: number): boolean {
  if (!WHOLE_NUMBER.test(value.trim())) return false
  const n = Number(value)
  return n >= min && n <= max
}

/** Client rules from AC-C2 with the ui-design §6.4 messages. Pure; `now` is injected. */
export function validate(
  values: CreateSessionFormValues,
  now: Date,
  coachIds: ReadonlySet<string>,
): FieldErrors {
  const errors: FieldErrors = {}
  if (!lengthBetween(values.title, 3, 80)) errors.title = 'Enter a title of 3 to 80 characters.'
  if (!(SESSION_TYPES as readonly string[]).includes(values.type)) errors.type = 'Choose a session type.'

  if (values.date === '') errors.date = 'Enter a date.'
  if (values.time === '') errors.time = 'Enter a start time.'
  if (values.date !== '' && values.time !== '') {
    const start = localDateTimeToDate(values.date, values.time)
    if (start === null || start.getTime() <= now.getTime()) {
      errors.date = 'Choose a start date and time in the future.'
    }
  }

  if (!intBetween(values.durationMinutes, 30, 240)) errors.durationMinutes = 'Enter whole minutes from 30 to 240.'
  if (!intBetween(values.capacity, 1, 100)) errors.capacity = 'Enter a whole number of places from 1 to 100.'
  if (values.coachId === '' || !coachIds.has(values.coachId)) errors.coachId = 'Choose a coach.'
  if (!lengthBetween(values.locationName, 2, 80)) {
    errors.locationName = 'Enter a location name of 2 to 80 characters.'
  }
  if (!lengthBetween(values.locationAddress, 3, 120)) {
    errors.locationAddress = 'Enter an address of 3 to 120 characters.'
  }
  if (!(VISIBILITIES as readonly string[]).includes(values.visibility)) {
    errors.visibility = 'Choose who can see this session.'
  }
  if (values.trainerNotes.length > TRAINER_NOTES_MAX) {
    errors.trainerNotes = `Keep trainer notes to 500 characters or fewer (${values.trainerNotes.length} now).`
  }
  return errors
}

const SERVER_FIELD_MAP: Record<string, FieldName> = {
  title: 'title',
  type: 'type',
  visibility: 'visibility',
  capacity: 'capacity',
  locationName: 'locationName',
  locationAddress: 'locationAddress',
  description: 'description',
  trainerNotes: 'trainerNotes',
  durationMinutes: 'durationMinutes',
  coachId: 'coachId',
  startsAt: 'date', // shown once under the Start group (api-integration §2.6)
}

/** Maps contract `fieldErrors` keys to form controls; unknown keys become form-level messages. */
export function mapServerFieldErrors(fieldErrors: Record<string, string>): {
  fields: FieldErrors
  unmapped: string[]
} {
  const fields: FieldErrors = {}
  const unmapped: string[] = []
  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = SERVER_FIELD_MAP[key]
    if (field) fields[field] = message
    else unmapped.push(message)
  }
  return { fields, unmapped }
}
