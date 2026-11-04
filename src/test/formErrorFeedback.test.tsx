// Browser-verify BV-1 / amended F26 and review N-1: the form-level create error is focused and
// scrolled into view, and disappears only per the ui-design 2026-11-04 amendment rules.
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockState } from '../mocks/controls'
import { server } from '../mocks/node'
import { FIXED_NOW } from './fixedNow'
import { renderApp } from './renderApp'

// jsdom does not implement scrollIntoView; record calls instead.
let scrollIntoView: ReturnType<typeof vi.fn>
const original = Element.prototype.scrollIntoView
beforeEach(() => {
  scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView']
})
afterEach(() => {
  Element.prototype.scrollIntoView = original
})

async function submitValidForm(user: UserEvent) {
  await screen.findByRole('link', { name: 'U14 Shooting Lab' })
  await user.click(screen.getByRole('button', { name: 'Create session' }))
  const dialog = await screen.findByRole('dialog', { name: 'Create session' })
  const f = within(dialog)
  await f.findByRole('option', { name: 'Maya Brooks' })
  await user.type(f.getByLabelText('Title'), 'U16 Rebounding Clinic')
  await user.type(f.getByLabelText('Date'), '2026-07-28')
  await user.type(f.getByLabelText('Start time'), '18:00')
  await user.type(f.getByLabelText('Capacity'), '12')
  await user.selectOptions(f.getByLabelText('Coach'), 'Maya Brooks')
  await user.type(f.getByLabelText('Location name'), 'North Court')
  await user.type(f.getByLabelText('Location address'), '18 Harbor Street')
  await user.click(f.getByRole('button', { name: 'Create session' }))
  return f
}

const formErrorBox = (f: ReturnType<typeof within>) => f.queryByRole('alert')?.closest('.form-error') ?? null

const validationFailure = (fieldErrors: Record<string, string>) =>
  http.post('*/api/sessions', () =>
    HttpResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Some fields need attention.', fieldErrors } },
      { status: 400 },
    ),
  )

describe('F26 (amended): failed create focuses and reveals the form-level error', () => {
  it('500: focus moves to the error box and it is scrolled into view', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'create-error', latencyMs: 0 })
    const { user } = renderApp()
    const f = await submitValidForm(user)
    await f.findByText(/The session couldn't be created/)
    const box = formErrorBox(f)
    expect(box).not.toBeNull()
    await waitFor(() => expect(box).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts).toContain(box)
    expect(f.getByRole('button', { name: 'Create session' })).not.toHaveAttribute('aria-disabled')
  })

  it('network failure: same focus and scroll, with [Check Sessions List] inside the box', async () => {
    server.use(http.post('*/api/sessions', () => HttpResponse.error()))
    const { user } = renderApp()
    const f = await submitValidForm(user)
    await f.findByRole('button', { name: 'Check Sessions List' })
    const box = formErrorBox(f)
    await waitFor(() => expect(box).toHaveFocus())
    expect(scrollIntoView.mock.contexts).toContain(box)
  })
})

describe('N-1: when the form-level error box disappears', () => {
  it('is removed once every highlighted server field error is cleared', async () => {
    server.use(validationFailure({ coachId: 'Unknown coach' }))
    const { user } = renderApp()
    const f = await submitValidForm(user)
    expect(await f.findByRole('alert')).toHaveTextContent('Fix the highlighted fields')

    await user.type(f.getByLabelText('Title'), ' B') // a different field: box stays
    expect(f.getByRole('alert')).toHaveTextContent('Fix the highlighted fields')

    await user.selectOptions(f.getByLabelText('Coach'), 'Ethan Cole')
    await waitFor(() => expect(formErrorBox(f)).toBeNull())
    expect(f.getByLabelText('Coach')).toHaveFocus() // focus does not move
  })

  it('keeps unmapped messages but drops the "highlighted fields" sentence', async () => {
    server.use(validationFailure({ coachId: 'Unknown coach', foo: 'Odd' }))
    const { user } = renderApp()
    const f = await submitValidForm(user)
    await f.findByText('Unknown coach')

    await user.selectOptions(f.getByLabelText('Coach'), 'Ethan Cole')
    const alert = f.getByRole('alert')
    expect(alert).toHaveTextContent('Check the form, then submit again.')
    expect(alert).toHaveTextContent('Odd')
    expect(alert).not.toHaveTextContent('Fix the highlighted fields')
  })

  it('a 500 error box is not removed by field edits', async () => {
    resetMockState({ now: FIXED_NOW, scenario: 'create-error', latencyMs: 0 })
    const { user } = renderApp()
    const f = await submitValidForm(user)
    await f.findByText(/The session couldn't be created/)
    await user.type(f.getByLabelText('Title'), ' B')
    expect(f.getByRole('alert')).toHaveTextContent("The session couldn't be created")
  })
})
