// Extra risk-based tests E1–E5 and E7 (implementation-plan §3).
import { act, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { resetMockState } from '../mocks/controls'
import { server } from '../mocks/node'
import { FIXED_NOW } from './fixedNow'
import { renderApp, type RecordedRequest } from './renderApp'

const posts = (requests: RecordedRequest[]) =>
  requests.filter((r) => r.method === 'POST' && r.url.pathname === '/api/sessions')

async function openCreate(user: UserEvent, waitForCoaches = true) {
  await user.click(screen.getByRole('button', { name: 'Create session' }))
  const dialog = (await screen.findByRole('dialog', { name: 'Create session' })) as HTMLDialogElement
  if (waitForCoaches) await within(dialog).findByRole('option', { name: 'Maya Brooks' })
  return dialog
}

async function fillValid(user: UserEvent, dialog: HTMLElement) {
  const f = within(dialog)
  await user.type(f.getByLabelText('Title'), 'U16 Rebounding Clinic')
  await user.type(f.getByLabelText('Date'), '2026-07-28')
  await user.type(f.getByLabelText('Start time'), '18:00')
  await user.type(f.getByLabelText('Capacity'), '12')
  await user.selectOptions(f.getByLabelText('Coach'), 'Maya Brooks')
  await user.type(f.getByLabelText('Location name'), 'North Court')
  await user.type(f.getByLabelText('Location address'), '18 Harbor Street')
}

/** Simulates Chrome's non-cancelable close request: the native dialog closes itself. */
async function nativeSelfClose(dialog: HTMLDialogElement) {
  await act(async () => {
    dialog.dispatchEvent(new Event('cancel', { cancelable: false }))
    dialog.close()
  })
}

async function pressEscape(): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
  await act(async () => {
    document.dispatchEvent(event)
  })
  return event
}

/** Lets the Drawer's 100 ms "already handled" window lapse, so the next close is a fresh request. */
const settleCloseWindow = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)))

describe('E1: details URL param keeps every other query parameter and the hash', () => {
  it('preserves ?scenario= and other params through open, close, back and forward', async () => {
    const { user } = renderApp({ url: '/?scenario=list-error&x=1#h' })
    const link = await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    // R-3: the href itself keeps the other params and the hash (new tab, copied link).
    expect(link).toHaveAttribute('href', '/?scenario=list-error&x=1&session=ses_101#h')
    const expectBase = () => {
      const params = new URLSearchParams(window.location.search)
      expect(params.get('scenario')).toBe('list-error')
      expect(params.get('x')).toBe('1')
      expect(window.location.hash).toBe('#h')
    }

    await user.click(link)
    await screen.findByRole('dialog', { name: 'U14 Shooting Lab' })
    expectBase()
    expect(new URLSearchParams(window.location.search).get('session')).toBe('ses_101')

    await user.click(screen.getByRole('button', { name: 'Close details' }))
    await waitFor(() => expect(new URLSearchParams(window.location.search).has('session')).toBe(false))
    expectBase()
    await waitFor(() => expect(screen.getByRole('link', { name: 'U14 Shooting Lab' })).toHaveFocus()) // F5

    await act(async () => window.history.forward())
    await waitFor(() => expect(new URLSearchParams(window.location.search).get('session')).toBe('ses_101'))
    expectBase()
    await act(async () => window.history.back())
    await waitFor(() => expect(new URLSearchParams(window.location.search).has('session')).toBe(false))
    expectBase()
  })
})

describe('E2: server 400 fieldErrors map to the form', () => {
  it('shows server field messages under their controls and unknown keys in the form box', async () => {
    server.use(
      http.post('*/api/sessions', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Some fields need attention.',
              fieldErrors: { startsAt: 'Bad start', coachId: 'Unknown coach', foo: 'Odd' },
            },
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreate(user)
    const f = within(dialog)
    await fillValid(user, dialog)
    await user.click(f.getByRole('button', { name: 'Create session' }))

    const startGroup = await f.findByRole('group', { name: 'Start' })
    expect(within(startGroup).getByText('Bad start')).toBeInTheDocument()
    expect(f.getByLabelText('Coach')).toHaveAttribute('aria-invalid', 'true')
    expect(f.getByLabelText('Coach')).toHaveAccessibleDescription('Unknown coach')
    const alert = f.getByRole('alert')
    expect(alert).toHaveTextContent('Fix the highlighted fields')
    expect(alert).toHaveTextContent('Odd')
    expect(f.getByLabelText('Title')).toHaveValue('U16 Rebounding Clinic')
    expect(f.getByLabelText('Date')).toHaveFocus() // F24

    // R-7: editing another field keeps the server's coach error; editing Coach clears it.
    await user.type(f.getByLabelText('Title'), ' B')
    expect(f.getByText('Unknown coach')).toBeInTheDocument()
    expect(within(startGroup).getByText('Bad start')).toBeInTheDocument()
    await user.selectOptions(f.getByLabelText('Coach'), 'Ethan Cole')
    expect(f.queryByText('Unknown coach')).not.toBeInTheDocument()
    expect(f.getByLabelText('Coach')).not.toHaveAttribute('aria-invalid')
    await user.clear(f.getByLabelText('Start time'))
    await user.type(f.getByLabelText('Start time'), '19:00')
    expect(within(startGroup).queryByText('Bad start')).not.toBeInTheDocument()
  })
})

describe('E3: coaches-error blocks submit', () => {
  it('disables coach choice and submit until a retry succeeds', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'coaches-error', latencyMs: 0 })
    const { user, requests } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreate(user, false)
    const f = within(dialog)

    expect(await f.findByRole('alert')).toHaveTextContent("Coaches couldn't load, so a coach can't be chosen yet.")
    expect(f.getByLabelText('Coach')).toBeDisabled()
    const submit = f.getByRole('button', { name: 'Create session' })
    expect(submit).toBeDisabled()
    expect(f.getByText('Creating is unavailable until coaches load.')).toBeInTheDocument()

    await user.type(f.getByLabelText('Title'), 'Draft title{Enter}')
    expect(posts(requests)).toHaveLength(0)

    resetMockState({ now: FIXED_NOW, scenario: 'normal', latencyMs: 0 })
    await user.click(f.getByRole('button', { name: 'Retry Loading Coaches' }))
    await f.findByRole('option', { name: 'Maya Brooks' })
    expect(f.getByRole('button', { name: 'Create session' })).toBeEnabled()
    await waitFor(() => expect(f.getByLabelText('Coach')).toHaveFocus()) // F31
    expect(f.getByLabelText('Title')).toHaveValue('Draft title')
  })
})

describe('E4: native dialog self-close guard (ui-design §4.4.1)', () => {
  it('handles Escape at keydown and reopens a dirty form after a non-cancelable close', async () => {
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreate(user)
    const f = within(dialog)
    await user.type(f.getByLabelText('Title'), 'Draft')

    // (a) First Escape: intercepted at keydown, the discard bar appears.
    const first = await pressEscape()
    expect(first.defaultPrevented).toBe(true)
    expect(await f.findByText(/Discard this new session\?/)).toBeInTheDocument()
    await waitFor(() => expect(f.getByRole('button', { name: 'Keep Editing' })).toHaveFocus()) // F19

    // (b) Second Escape in Chrome: keydown plus a non-cancelable cancel that closes the dialog.
    await pressEscape()
    await nativeSelfClose(dialog)
    expect(dialog.open).toBe(true)
    await waitFor(() => expect(f.queryByText(/Discard this new session\?/)).not.toBeInTheDocument())
    expect(f.getByLabelText('Title')).toHaveValue('Draft')
    await waitFor(() => expect(f.getByLabelText('Title')).toHaveFocus()) // F38

    // A close request with no keydown (e.g. a back gesture) on a dirty form: reopen + discard bar.
    await settleCloseWindow()
    await nativeSelfClose(dialog)
    expect(dialog.open).toBe(true)
    expect(await f.findByText(/Discard this new session\?/)).toBeInTheDocument()
    await waitFor(() => expect(f.getByRole('button', { name: 'Keep Editing' })).toHaveFocus()) // F37
    expect(f.getByLabelText('Title')).toHaveValue('Draft')
  })

  it('reopens a pending create and keeps focus on submit', async () => {
    server.use(
      http.post('*/api/sessions', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreate(user)
    const f = within(dialog)
    await fillValid(user, dialog)
    await user.click(f.getByRole('button', { name: 'Create session' }))
    const submit = await f.findByRole('button', { name: 'Creating…' })
    expect(submit).toHaveAttribute('aria-disabled', 'true')

    await settleCloseWindow()
    await nativeSelfClose(dialog)
    expect(dialog.open).toBe(true)
    expect(f.getByRole('button', { name: 'Creating…' })).toHaveFocus() // F39
    expect(f.getByLabelText('Title')).toHaveValue('U16 Rebounding Clinic')
  })

  it('treats a details self-close as a close and removes the URL param', async () => {
    const { user } = renderApp()
    await user.click(await screen.findByRole('link', { name: 'U14 Shooting Lab' }))
    const dialog = (await screen.findByRole('dialog', { name: 'U14 Shooting Lab' })) as HTMLDialogElement
    await nativeSelfClose(dialog)
    await waitFor(() => expect(new URLSearchParams(window.location.search).has('session')).toBe(false))
    expect(dialog.open).toBe(false)
    await waitFor(() => expect(screen.getByRole('link', { name: 'U14 Shooting Lab' })).toHaveFocus()) // F35
  })
})

describe('E5: pending blocks select and radio changes', () => {
  it('ignores session type and visibility changes while the POST is in flight', async () => {
    server.use(
      http.post('*/api/sessions', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreate(user)
    const f = within(dialog)
    await fillValid(user, dialog)
    await user.click(f.getByRole('button', { name: 'Create session' }))
    const submit = await f.findByRole('button', { name: 'Creating…' })
    expect(submit).toHaveFocus() // F23

    await user.selectOptions(f.getByLabelText('Session type'), 'camp')
    await user.click(f.getByLabelText('Invite only'))
    expect(f.getByLabelText('Session type')).toHaveValue('training')
    expect(f.getByLabelText('Public')).toBeChecked()
    expect(f.getByLabelText('Invite only')).not.toBeChecked()
    expect(f.getByLabelText('Title')).toHaveAttribute('readonly')
  })
})

describe('E7: details failure and not-found through a deep link', () => {
  it('shows the details error with retry, while other sessions still load', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'details-error', latencyMs: 0 })
    const { user } = renderApp({ url: '/?session=ses_101' })
    const dialog = await screen.findByRole('dialog', { name: 'U14 Shooting Lab' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent("Details couldn't load")
    expect(within(dialog).getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Back to Sessions' }))
    await waitFor(() => expect(new URLSearchParams(window.location.search).has('session')).toBe(false))

    await user.click(screen.getByRole('link', { name: 'Varsity Defense Intensive' }))
    const other = await screen.findByRole('dialog', { name: 'Varsity Defense Intensive' })
    expect(await within(other).findByText('24 booked of 24 places · Full')).toBeInTheDocument()
  })

  it('shows "Session not found" without retry for an unknown id', async () => {
    renderApp({ url: '/?session=ses_unknown' })
    const dialog = await screen.findByRole('dialog', { name: 'Session details' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Session not found')
    expect(within(dialog).queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument()
  })
})
