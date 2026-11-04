export function fieldIds(id: string) {
  return { errorId: `${id}-error`, hintId: `${id}-hint` }
}

/** aria wiring for a control: invalid state and description ids (ui-design §4.2). */
export function controlA11y(id: string, error: string | undefined, hint?: boolean) {
  const { errorId, hintId } = fieldIds(id)
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy === '' ? undefined : describedBy,
  } as const
}
