import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { resetMockState } from '../mocks/controls'
import { server } from '../mocks/node'
import './dialogPolyfill'
import { FIXED_NOW } from './fixedNow'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  // Freeze only Date so user-event, debounce, and MSW timers keep running (architecture AD-8).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
  resetMockState({ now: FIXED_NOW, latencyMs: 0 })
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.useRealTimers()
})

afterAll(() => {
  server.close()
})
