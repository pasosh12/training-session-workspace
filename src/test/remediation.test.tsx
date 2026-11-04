// Review round 1 tests: AC-C8 discoverability (R-2), the "List updated" prefix (R-5), and
// retry attribution after a filter change (R-6). Kept in src/test/ because they select scenarios.
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { resetMockState } from '../mocks/controls'
import { server } from '../mocks/node'
import { FIXED_NOW } from './fixedNow'
import { renderApp, sessionListRequests } from './renderApp'

async function createSession(user: UserEvent, title = 'U16 Rebounding Clinic') {
  await user.click(screen.getByRole('button', { name: 'Create session' }))
  const dialog = await screen.findByRole('dialog', { name: 'Create session' })
  const f = within(dialog)
  await f.findByRole('option', { name: 'Maya Brooks' })
  await user.type(f.getByLabelText('Title'), title)
  await user.type(f.getByLabelText('Date'), '2026-07-28')
  await user.type(f.getByLabelText('Start time'), '18:00')
  await user.type(f.getByLabelText('Capacity'), '12')
  await user.selectOptions(f.getByLabelText('Coach'), 'Maya Brooks')
  await user.type(f.getByLabelText('Location name'), 'North Court')
  await user.type(f.getByLabelText('Location address'), '18 Harbor Street')
  await user.click(f.getByRole('button', { name: 'Create session' }))
  return dialog
}

const bannerText = () => screen.getByText(/Session “.*” created\./, { selector: '[role="status"] *' })

describe('R-2: AC-C8 discoverability of a new session', () => {
  it('says the filters hide it, and [Show All Sessions] resets them and reveals it', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    await user.selectOptions(screen.getByLabelText('Status'), 'cancelled')
    await screen.findByRole('heading', { level: 2, name: '1 session' })

    await createSession(user)
    expect(
      await screen.findByText('Session “U16 Rebounding Clinic” created. The current filters hide it.', {
        selector: '[role="status"] *',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'U16 Rebounding Clinic' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show All Sessions' }))
    expect(screen.getByRole('button', { name: 'Open Session' })).toHaveFocus() // F28
    expect(screen.getByLabelText('Status')).toHaveValue('')
    const newRow = await screen.findByRole('link', { name: 'U16 Rebounding Clinic' })
    expect(within(newRow.closest('td') as HTMLElement).getByText('New')).toBeInTheDocument()
    await waitFor(() =>
      expect(bannerText()).toHaveTextContent("Session “U16 Rebounding Clinic” created. It's marked New in the list."),
    )
    expect(screen.queryByRole('button', { name: 'Show All Sessions' })).not.toBeInTheDocument()

    // [Open Session] works from the banner.
    await user.click(screen.getByRole('button', { name: 'Open Session' }))
    expect(await screen.findByRole('dialog', { name: 'U16 Rebounding Clinic' })).toBeInTheDocument()
  })

  it('says the list could not refresh when the refetch after create fails', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    server.use(
      http.get('*/api/sessions', () =>
        HttpResponse.json(
          { error: { code: 'SESSIONS_UNAVAILABLE', message: 'Sessions cannot be loaded right now.' } },
          { status: 500 },
        ),
      ),
    )

    await createSession(user)
    expect(
      await screen.findByText("Session “U16 Rebounding Clinic” created. The list couldn't refresh.", {
        selector: '[role="status"] *',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Sessions couldn't load")
    expect(screen.getByRole('button', { name: 'Open Session' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show All Sessions' })).not.toBeInTheDocument()
  })
})

describe('R-5: the "List updated" prefix applies to the checked run only', () => {
  it('announces "List updated" after [Check Sessions List], then drops the prefix', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    server.use(http.post('*/api/sessions', () => HttpResponse.error()))
    const dialog = await createSession(user)
    const f = within(dialog)
    await user.click(await f.findByRole('button', { name: 'Check Sessions List' }))

    const results = screen.getByRole('region', { name: /session/ })
    await waitFor(() =>
      expect(within(results).getByRole('status')).toHaveTextContent('List updated: 5 sessions'),
    )

    // Close the drawer (discard the draft) and filter: the next announcement has no prefix.
    await user.click(f.getByRole('button', { name: 'Cancel' }))
    await user.click(await f.findByRole('button', { name: 'Discard' }))
    await user.selectOptions(screen.getByLabelText('Status'), 'full')
    await screen.findByRole('heading', { level: 2, name: '1 session' })
    expect(within(results).getByRole('status')).toHaveTextContent(/^1 session$/)
  })
})

describe('R-6: a filter change after a list error is a new load, not a retry', () => {
  it('shows the loading state instead of a "Trying again…" button the user never pressed', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'list-error', latencyMs: 0 })
    const { user, requests } = renderApp()
    await screen.findByRole('alert')
    server.use(
      http.get('*/api/sessions', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )

    await user.selectOptions(screen.getByLabelText('Status'), 'full')
    await waitFor(() => expect(sessionListRequests(requests)).toHaveLength(2))
    expect(screen.queryByRole('button', { name: 'Trying again…' })).not.toBeInTheDocument()
    expect(screen.getByText('Loading sessions…', { selector: '[role="status"]' })).toBeInTheDocument()
  })

  it('still shows "Trying again…" when the user presses Retry', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'list-error', latencyMs: 0 })
    const { user } = renderApp()
    await screen.findByRole('alert')
    server.use(
      http.get('*/api/sessions', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByRole('button', { name: 'Trying again…' })).toHaveAttribute('aria-disabled', 'true')
  })
})
