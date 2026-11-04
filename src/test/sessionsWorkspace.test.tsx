// Essential behavior tests T1–T6 (implementation-plan §2, AC-T1). Kept in src/test/ because they
// select mock scenarios, which must not appear under src/app, src/features, src/api, or src/lib.
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { resetMockState } from '../mocks/controls'
import { FIXED_NOW } from './fixedNow'
import { renderApp, sessionListRequests, type RecordedRequest } from './renderApp'

function rowTitles(): string[] {
  const table = screen.getByRole('table', { name: 'Training sessions' })
  return within(table)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

function postRequests(requests: RecordedRequest[]) {
  return requests.filter((r) => r.method === 'POST' && r.url.pathname === '/api/sessions')
}

async function openCreateDrawer(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Create session' }))
  const dialog = await screen.findByRole('dialog', { name: 'Create session' })
  await within(dialog).findByRole('option', { name: 'Maya Brooks' })
  return dialog
}

async function fillValidForm(user: UserEvent, dialog: HTMLElement, title = 'U16 Rebounding Clinic') {
  const form = within(dialog)
  await user.clear(form.getByLabelText('Title'))
  await user.type(form.getByLabelText('Title'), title)
  await user.type(form.getByLabelText('Date'), '2026-07-28')
  await user.type(form.getByLabelText('Start time'), '18:00')
  await user.type(form.getByLabelText('Capacity'), '12')
  await user.selectOptions(form.getByLabelText('Coach'), 'Maya Brooks')
  await user.type(form.getByLabelText('Location name'), 'North Court')
  await user.type(form.getByLabelText('Location address'), '18 Harbor Street')
}

describe('Sessions workspace', () => {
  it('T1: search and status filtering happen in the handler', async () => {
    const { user, requests } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })

    const search = screen.getByLabelText('Search')
    await user.type(search, 'maya')
    await screen.findByRole('heading', { level: 2, name: '2 sessions' })
    expect(rowTitles()).toEqual(['U14 Shooting Lab', 'Private Footwork Review'])

    // Mandatory: the outgoing request carried the filter, so the handler did the filtering.
    const afterSearch = sessionListRequests(requests).at(-1)
    expect(afterSearch?.searchParams.get('query')).toBe('maya')
    expect(afterSearch?.searchParams.has('status')).toBe(false)

    await user.selectOptions(screen.getByLabelText('Status'), 'cancelled')
    await screen.findByRole('heading', { level: 2, name: 'No sessions' })
    const beforeClear = sessionListRequests(requests).length
    await user.clear(search)

    await screen.findByRole('heading', { level: 2, name: '1 session' })
    expect(rowTitles()).toEqual(['Weekend Ball Handling'])
    const afterClear = sessionListRequests(requests).slice(beforeClear)
    expect(afterClear.length).toBeGreaterThan(0)
    expect(afterClear.at(-1)?.searchParams.get('status')).toBe('cancelled')
    expect(afterClear.at(-1)?.searchParams.has('query')).toBe(false)
    expect(afterClear.some((url) => url.searchParams.has('query') && url.searchParams.has('status'))).toBe(false)
  })

  it('T2: shows the initial loading state, then the populated list', async () => {
    renderApp()
    expect(screen.getByText('Loading sessions…', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Sessions' })).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '5 sessions' })).toBeInTheDocument()
  })

  it('T3: distinguishes "no sessions exist" from "no matches"', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'empty', latencyMs: 0 })
    const first = renderApp()
    const emptyHeading = await screen.findByRole('heading', { name: 'No sessions yet' })
    const emptyState = emptyHeading.closest('.empty-state') as HTMLElement
    expect(within(emptyState).getByRole('button', { name: 'Create session' })).toBeInTheDocument()
    first.unmount()

    resetMockState({ now: FIXED_NOW, scenario: 'normal', latencyMs: 0 })
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const search = screen.getByLabelText('Search')
    await user.type(search, 'zzz')
    const noMatches = await screen.findByRole('heading', { name: 'No matching sessions' })
    expect(screen.queryByRole('heading', { name: 'No sessions yet' })).not.toBeInTheDocument()
    expect(screen.getByText('No sessions match “zzz”.')).toBeInTheDocument()

    const noMatchesState = noMatches.closest('.empty-state') as HTMLElement
    await user.click(within(noMatchesState).getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('link', { name: 'U14 Shooting Lab' })).toBeInTheDocument()
    expect(search).toHaveFocus() // F15
  })

  it('T4: create validates, sends one POST, and makes the new session discoverable', async () => {
    const { user, requests } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreateDrawer(user)
    const form = within(dialog)

    await user.click(form.getByRole('button', { name: 'Create session' }))
    expect(form.getByText('Enter a title of 3 to 80 characters.')).toBeInTheDocument()
    expect(form.getByText('Choose a coach.')).toBeInTheDocument()
    expect(form.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(form.getByLabelText('Title')).toHaveFocus() // F22
    expect(postRequests(requests)).toHaveLength(0)

    await fillValidForm(user, dialog)
    await user.dblClick(form.getByRole('button', { name: 'Create session' }))

    expect(
      await screen.findByText(/Session “U16 Rebounding Clinic” created\./, { selector: '[role="status"] *' }),
    ).toBeInTheDocument()
    expect(postRequests(requests)).toHaveLength(1)
    const newRow = await screen.findByRole('link', { name: 'U16 Rebounding Clinic' })
    expect(within(newRow.closest('td') as HTMLElement).getByText('New')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create session' })).toHaveFocus()) // F27
  })

  it('T5: a create server failure keeps every entered value', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'create-error', latencyMs: 0 })
    const { user } = renderApp()
    await screen.findByRole('link', { name: 'U14 Shooting Lab' })
    const dialog = await openCreateDrawer(user)
    const form = within(dialog)
    await fillValidForm(user, dialog)
    await user.click(form.getByRole('button', { name: 'Create session' }))

    expect(
      await form.findByText(/The session couldn't be created\. Your entries are kept/, { selector: '[role="alert"] *' }),
    ).toBeInTheDocument()
    expect(form.getByLabelText('Title')).toHaveValue('U16 Rebounding Clinic')
    expect(form.getByLabelText('Date')).toHaveValue('2026-07-28')
    expect(form.getByLabelText('Start time')).toHaveValue('18:00')
    expect(form.getByLabelText('Duration (minutes)')).toHaveValue(60)
    expect(form.getByLabelText('Capacity')).toHaveValue(12)
    expect(form.getByLabelText('Coach')).toHaveValue('coach_01')
    expect(form.getByLabelText('Location name')).toHaveValue('North Court')
    expect(form.getByLabelText('Location address')).toHaveValue('18 Harbor Street')
    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(form.getByRole('button', { name: 'Create session' })).not.toHaveAttribute('aria-disabled')
  })

  it('T6: a list error offers retry, and retrying sends a new request', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'list-error', latencyMs: 0 })
    const { user, requests } = renderApp()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Sessions couldn't load")
    expect(sessionListRequests(requests)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Try Again' }))
    await waitFor(() => expect(sessionListRequests(requests)).toHaveLength(2))
    expect(await screen.findByRole('alert')).toHaveTextContent("Sessions couldn't load")
    expect(screen.getByLabelText('Search')).toBeEnabled()
    expect(screen.getByLabelText('Status')).toBeEnabled()
  })
})
