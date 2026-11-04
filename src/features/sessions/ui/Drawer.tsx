import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'

/** What the owner decided for a close request: stay open (e.g. discard bar, pending) or close. */
export type CloseDecision = 'stay' | 'close'

/**
 * Native <dialog> drawer shell (ui-design §3, §4). `isOpen` is owned by the caller and is the only
 * source of truth. Implements the self-close guard of ui-design §4.4.1:
 * 1. Escape is intercepted on `document` in the capture phase and routed to `onCloseRequest`.
 * 2. `cancel` is prevented and routed (non-cancelable cancel is deferred to rule 3).
 * 3. A `close` the app did not start is reconciled: the owner decides, and `stay` reopens.
 */
export function Drawer({
  isOpen,
  onCloseRequest,
  onReopened,
  onBackdropClick,
  size,
  eyebrow,
  title,
  closeLabel,
  closeDisabled = false,
  initialFocusRef,
  headingRef: externalHeadingRef,
  footer,
  children,
}: {
  isOpen: boolean
  onCloseRequest: () => CloseDecision
  /** Called after a self-closed dialog was reopened, for focus placement (F39). */
  onReopened?: () => void
  onBackdropClick?: () => void
  size: 'details' | 'create'
  eyebrow?: string
  title: ReactNode
  closeLabel: string
  closeDisabled?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  headingRef?: RefObject<HTMLHeadingElement | null>
  footer?: ReactNode
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const ownHeadingRef = useRef<HTMLHeadingElement>(null)
  const headingRef = externalHeadingRef ?? ownHeadingRef
  const titleId = useId()

  const appClosing = useRef(false)
  const handledDecision = useRef<CloseDecision | null>(null)
  const handledTimer = useRef<number | undefined>(undefined)
  const savedScrollTop = useRef(0)

  // Latest callbacks for the native listeners without re-subscribing.
  const callbacks = useRef({ onCloseRequest, onReopened })
  useLayoutEffect(() => {
    callbacks.current = { onCloseRequest, onReopened }
  })

  const rememberDecision = (decision: CloseDecision) => {
    handledDecision.current = decision
    window.clearTimeout(handledTimer.current)
    // Long enough to cover the cancel/close events a browser may still queue for this Escape.
    handledTimer.current = window.setTimeout(() => {
      handledDecision.current = null
    }, 100)
  }

  // Open/close the native dialog from app state.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      delete dialog.dataset.instant
      dialog.showModal()
      const target = initialFocusRef?.current ?? headingRef.current
      target?.focus()
    } else if (!isOpen && dialog.open) {
      appClosing.current = true
      dialog.close()
    }
  }, [isOpen, initialFocusRef, headingRef])

  // Rule 1: intercept Escape before the browser turns it into a close request.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const dialog = dialogRef.current
      if (!dialog?.open) return
      event.preventDefault()
      savedScrollTop.current = bodyRef.current?.scrollTop ?? 0
      rememberDecision(callbacks.current.onCloseRequest())
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [isOpen])

  // Rules 2 and 3: cancel fallback and close reconciliation.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      savedScrollTop.current = bodyRef.current?.scrollTop ?? 0
      if (event.cancelable) event.preventDefault()
      if (handledDecision.current !== null) return // already handled at keydown
      if (event.cancelable) {
        callbacks.current.onCloseRequest()
      } else {
        // The dialog will close itself; decide now, apply in the close handler.
        rememberDecision(callbacks.current.onCloseRequest())
      }
    }

    const onClose = () => {
      if (appClosing.current) {
        appClosing.current = false
        return
      }
      const decision = handledDecision.current ?? callbacks.current.onCloseRequest()
      handledDecision.current = null
      if (decision === 'stay') {
        dialog.dataset.instant = 'true' // reopen without the slide animation (§4.4.1 rule 5)
        dialog.showModal()
        if (bodyRef.current) bodyRef.current.scrollTop = savedScrollTop.current
        callbacks.current.onReopened?.()
      }
    }

    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onClose)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onClose)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(handledTimer.current), [])

  return (
    <dialog
      ref={dialogRef}
      className={`drawer drawer--${size}`}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onBackdropClick?.()
      }}
    >
      <div className="drawer__panel">
        <header className="drawer__header">
          <div className="drawer__heading">
            {eyebrow ? <p className="drawer__eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} ref={headingRef} tabIndex={-1}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="drawer__close"
            aria-label={closeLabel}
            aria-disabled={closeDisabled || undefined}
            onClick={() => {
              if (!closeDisabled) callbacks.current.onCloseRequest()
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="drawer__body" ref={bodyRef}>
          {children}
        </div>
        {footer ? <div className="drawer__footer">{footer}</div> : null}
      </div>
    </dialog>
  )
}
