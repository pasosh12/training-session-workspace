import { SessionsWorkspace } from '../features/sessions/SessionsWorkspace'
import '../features/sessions/sessions.css'
import { ErrorBoundary } from './ErrorBoundary'

export function App() {
  return (
    <ErrorBoundary>
      <a className="skip-link" href="#results-heading">
        Skip to sessions
      </a>
      <SessionsWorkspace />
    </ErrorBoundary>
  )
}
