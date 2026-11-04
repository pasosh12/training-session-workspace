import type { CreateSessionInput } from '../../../api/mappers'

/** String values of every create control (ui-design §4.2); same shape as the API client input. */
export type CreateSessionFormValues = CreateSessionInput

export type FieldName = keyof CreateSessionFormValues

export const initialValues: CreateSessionFormValues = {
  title: '',
  type: 'training',
  date: '',
  time: '',
  durationMinutes: '60',
  capacity: '',
  coachId: '',
  locationName: '',
  locationAddress: '',
  visibility: 'public',
  description: '',
  trainerNotes: '',
}

export function isDirty(values: CreateSessionFormValues): boolean {
  return (Object.keys(initialValues) as FieldName[]).some((key) => values[key] !== initialValues[key])
}

/** DOM order of the controls, used to focus the first invalid field (F22, F24). */
export const FIELD_ORDER: FieldName[] = [
  'title',
  'type',
  'date',
  'time',
  'durationMinutes',
  'capacity',
  'coachId',
  'locationName',
  'locationAddress',
  'visibility',
  'description',
  'trainerNotes',
]
