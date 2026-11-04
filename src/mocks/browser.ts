import { setupWorker } from 'msw/browser'
import { resetMockState } from './controls'
import { handlers } from './handlers'
import { resolveScenario } from './scenarios'

/** Starts the MSW worker before the app renders (architecture AD-6, api-integration §7). */
export async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_API_MOCKING === 'off') return

  const scenario = resolveScenario(window.location.search)
  resetMockState({ now: new Date(), scenario })
  console.info(`[mocks] scenario: ${scenario}`)

  const worker = setupWorker(...handlers)
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: true,
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith('/api/')) print.error()
    },
  })
}
