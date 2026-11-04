import type { FormEvent, RefObject } from 'react'
import { failureCopy } from '../copy'
import type { ResourceState } from '../hooks/useAsyncResource'
import { SESSION_TYPES, VISIBILITIES, type Coach } from '../model'
import { SESSION_TYPE_LABELS, VISIBILITY_LABELS } from '../status'
import { Field } from '../ui/Field'
import { controlA11y, fieldIds } from '../ui/fieldA11y'
import { InlineError } from '../ui/InlineError'
import { RetryButton } from '../ui/RetryButton'
import type { CreateSessionFormValues, FieldName } from './formValues'
import { TRAINER_NOTES_MAX, type FieldErrors } from './validation'

export const CREATE_FORM_ID = 'create-session-form'
export const SUBMIT_HINT_ID = 'create-submit-hint'

export interface FormError {
  message: string
  details: string[]
  uncertain: boolean
}

/**
 * Presentational create form (ui-design §4.2). While pending, every change is ignored by the
 * owner's `setField` and controls signal it with readOnly / aria-disabled (selects and radios
 * ignore readOnly, so they rely on the controlled value plus aria-disabled).
 */
export function CreateSessionForm({
  values,
  errors,
  pending,
  coaches,
  formError,
  formErrorRef,
  fieldRefs,
  coachRetryPending,
  onField,
  onBlurField,
  onSubmit,
  onRetryCoaches,
  onCheckList,
}: {
  values: CreateSessionFormValues
  errors: FieldErrors
  pending: boolean
  coaches: ResourceState<Coach[]>
  formError: FormError | null
  formErrorRef: RefObject<HTMLDivElement | null>
  fieldRefs: RefObject<Partial<Record<FieldName, HTMLElement | null>>>
  coachRetryPending: boolean
  onField: (name: FieldName, value: string) => void
  onBlurField: (name: FieldName) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRetryCoaches: () => void
  onCheckList: () => void
}) {
  const bind = (name: FieldName) => ({
    name,
    value: values[name],
    ref: (node: HTMLElement | null) => {
      fieldRefs.current[name] = node
    },
    onBlur: () => onBlurField(name),
  })
  const textProps = (name: FieldName) => ({
    ...bind(name),
    readOnly: pending,
    onChange: (event: { target: { value: string } }) => onField(name, event.target.value),
  })
  const choiceProps = (name: FieldName) => ({
    ...bind(name),
    'aria-disabled': pending || undefined,
    onChange: (event: { target: { value: string } }) => onField(name, event.target.value),
  })

  const coachesReady = coaches.status === 'success'
  const startError = errors.date ?? errors.time
  const startErrorId = fieldIds('create-start').errorId
  const startDescribedBy = startError ? startErrorId : undefined
  const notesLength = values.trainerNotes.length
  const notesTooLong = notesLength > TRAINER_NOTES_MAX

  return (
    <form id={CREATE_FORM_ID} className="create-form" noValidate onSubmit={onSubmit}>
      <div className="create-form__error-slot">
        {formError ? (
          <div className="form-error" ref={formErrorRef} tabIndex={-1}>
            <div role="alert">
              <p>
                <span aria-hidden="true" className="field-error__icon">
                  !
                </span>
                {formError.message}
              </p>
              {formError.details.length > 0 ? (
                <ul>
                  {formError.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {formError.uncertain ? (
              <button type="button" className="button button--secondary" onClick={onCheckList}>
                Check Sessions List
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="create-form__grid">
        <Field id="create-title" label="Title" error={errors.title} className="span-2">
          <input type="text" autoComplete="off" {...textProps('title')} {...controlA11y('create-title', errors.title)} />
        </Field>

        <Field id="create-type" label="Session type" error={errors.type}>
          <select {...choiceProps('type')} {...controlA11y('create-type', errors.type)}>
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {SESSION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className={`field-group span-2${startError ? ' field--invalid' : ''}`}>
          <legend className="field__label">Start</legend>
          <div className="field-group__row">
            <div className="field">
              <label className="field__label field__label--sub" htmlFor="create-date">
                Date
              </label>
              <input
                type="date"
                id="create-date"
                {...textProps('date')}
                aria-invalid={errors.date ? true : undefined}
                aria-describedby={startDescribedBy}
              />
            </div>
            <div className="field">
              <label className="field__label field__label--sub" htmlFor="create-time">
                Start time
              </label>
              <input
                type="time"
                id="create-time"
                {...textProps('time')}
                aria-invalid={errors.time ? true : undefined}
                aria-describedby={startDescribedBy}
              />
            </div>
          </div>
          {startError ? (
            <p className="field-error" id={startErrorId}>
              <span aria-hidden="true" className="field-error__icon">
                !
              </span>
              {[errors.date, errors.time].filter(Boolean).join(' ')}
            </p>
          ) : null}
        </fieldset>

        <Field id="create-duration" label="Duration (minutes)" error={errors.durationMinutes}>
          <div className="input-suffix">
            <input
              type="number"
              inputMode="numeric"
              step={5}
              {...textProps('durationMinutes')}
              {...controlA11y('create-duration', errors.durationMinutes)}
            />
            <span aria-hidden="true">min</span>
          </div>
        </Field>

        <Field id="create-capacity" label="Capacity" error={errors.capacity}>
          <div className="input-suffix">
            <input
              type="number"
              inputMode="numeric"
              {...textProps('capacity')}
              {...controlA11y('create-capacity', errors.capacity)}
            />
            <span aria-hidden="true">places</span>
          </div>
        </Field>

        <Field id="create-coach" label="Coach" error={coachesReady ? errors.coachId : undefined} className="span-2">
          <select
            {...choiceProps('coachId')}
            disabled={!coachesReady}
            {...controlA11y('create-coach', coachesReady ? errors.coachId : undefined)}
          >
            {coaches.status === 'success' ? (
              <>
                <option value="">Choose a coach</option>
                {coaches.data.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </>
            ) : coaches.status === 'error' ? (
              <option value="">Coaches unavailable</option>
            ) : (
              <option value="">Loading coaches…</option>
            )}
          </select>
          {coaches.status === 'error' ? (
            <InlineError
              body={failureCopy('coaches', coaches.error).body}
              announceKey={coaches.failureCount}
              actions={
                <RetryButton
                  pending={coachRetryPending}
                  label="Retry Loading Coaches"
                  pendingLabel="Retrying…"
                  onRetry={onRetryCoaches}
                />
              }
            />
          ) : null}
        </Field>

        <Field id="create-location-name" label="Location name" error={errors.locationName}>
          <input
            type="text"
            autoComplete="off"
            {...textProps('locationName')}
            {...controlA11y('create-location-name', errors.locationName)}
          />
        </Field>

        <Field id="create-location-address" label="Location address" error={errors.locationAddress} className="span-2">
          <input
            type="text"
            autoComplete="off"
            {...textProps('locationAddress')}
            {...controlA11y('create-location-address', errors.locationAddress)}
          />
        </Field>

        <fieldset
          className={`field-group span-2${errors.visibility ? ' field--invalid' : ''}`}
          aria-describedby={errors.visibility ? fieldIds('create-visibility').errorId : undefined}
        >
          <legend className="field__label">Visibility</legend>
          <div className="radio-row">
            {VISIBILITIES.map((visibility, index) => (
              <label key={visibility} className="radio">
                <input
                  type="radio"
                  name="visibility"
                  value={visibility}
                  checked={values.visibility === visibility}
                  aria-disabled={pending || undefined}
                  ref={(node) => {
                    if (index === 0) fieldRefs.current.visibility = node
                  }}
                  onChange={(event) => onField('visibility', event.target.value)}
                />
                {VISIBILITY_LABELS[visibility]}
              </label>
            ))}
          </div>
          {errors.visibility ? (
            <p className="field-error" id={fieldIds('create-visibility').errorId}>
              {errors.visibility}
            </p>
          ) : null}
        </fieldset>

        <Field id="create-description" label="Description (optional)" error={errors.description} className="span-2">
          <textarea rows={3} {...textProps('description')} {...controlA11y('create-description', errors.description)} />
        </Field>

        <Field
          id="create-notes"
          label="Trainer notes (optional)"
          error={errors.trainerNotes}
          className="span-2"
          hint={
            <span className={notesTooLong ? 'counter counter--over' : 'counter'}>
              {notesLength} / {TRAINER_NOTES_MAX}
              {notesTooLong ? ' Too long' : null}
            </span>
          }
        >
          <textarea rows={3} {...textProps('trainerNotes')} {...controlA11y('create-notes', errors.trainerNotes, true)} />
        </Field>
      </div>
    </form>
  )
}
