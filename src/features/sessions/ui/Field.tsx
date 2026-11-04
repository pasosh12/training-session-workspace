import type { ReactNode } from 'react'
import { fieldIds } from './fieldA11y'

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p className="field-error" id={fieldIds(id).errorId}>
      <span aria-hidden="true" className="field-error__icon">
        !
      </span>
      {error}
    </p>
  )
}

export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`field${className ? ` ${className}` : ''}${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="field__hint" id={fieldIds(id).hintId}>
          {hint}
        </p>
      ) : null}
      <FieldError id={id} error={error} />
    </div>
  )
}
