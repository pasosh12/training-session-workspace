// R-1 regression: repeated details closes before `popstate` lands must not go back twice.
// jsdom merges queued back() traversals into one (verified with a plain JSDOM probe), so it can't
// reproduce the browser's two-entry jump; the contract is asserted on history.back() calls instead.
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from './renderApp'

describe('R-1: closing details is idempotent while the back traversal is pending', () => {
  it('a double close returns to the list entry, not the entry before it', async () => {
    // History before the app: [/previous, /(app)].
    window.history.replaceState(null, '', '/previous')
    window.history.pushState(null, '', '/')
    const { user } = renderApp({ url: '/' })

    await user.click(await screen.findByRole('link', { name: 'U14 Shooting Lab' }))
    await screen.findByRole('dialog', { name: 'U14 Shooting Lab' })
    expect(window.location.search).toBe('?session=ses_101')

    const back = vi.spyOn(window.history, 'back')
    // Two close requests in the same task, before any popstate can arrive.
    const close = screen.getByRole('button', { name: 'Close details' })
    act(() => {
      fireEvent.click(close)
      fireEvent.click(close)
    })

    expect(back).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(window.location.search).toBe(''))
    // Give any second queued traversal time to land before asserting the final position.
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)))
    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()

    // A later open/close cycle still closes through history.back() (the guard was released).
    await user.click(screen.getByRole('link', { name: 'U14 Shooting Lab' }))
    await screen.findByRole('dialog', { name: 'U14 Shooting Lab' })
    await user.click(screen.getByRole('button', { name: 'Close details' }))
    expect(back).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(window.location.search).toBe(''))
    back.mockRestore()
  })
})
