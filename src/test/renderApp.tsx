import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onTestFinished } from 'vitest'
import { App } from '../app/App'
import { server } from '../mocks/node'

export interface RecordedRequest {
  method: string
  url: URL
}

/** Renders the full app at `url` and records every outgoing request through `server.events`. */
export function renderApp({ url = '/' }: { url?: string } = {}) {
  window.history.replaceState(null, '', url)
  const requests: RecordedRequest[] = []
  const listener = ({ request }: { request: Request }) => {
    requests.push({ method: request.method, url: new URL(request.url) })
  }
  server.events.on('request:start', listener)
  onTestFinished(() => {
    server.events.removeListener('request:start', listener)
  })
  const user = userEvent.setup()
  const view = render(<App />)
  return { ...view, user, requests }
}

export function sessionListRequests(requests: RecordedRequest[]): URL[] {
  return requests
    .filter((r) => r.method === 'GET' && r.url.pathname === '/api/sessions')
    .map((r) => r.url)
}
