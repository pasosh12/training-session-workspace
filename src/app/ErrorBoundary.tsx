import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Render-error containment that keeps the page shell usable (architecture AD-9). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="page-main">
        <h1>Training sessions</h1>
        <div className="inline-error" role="alert">
          <p>Something went wrong. Reload the page to continue.</p>
          <div className="inline-error__actions">
            <button type="button" className="button button--secondary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      </main>
    )
  }
}
