// E6: date boundary unit tests (implementation-plan §3). UI tests run with a zero rebase offset,
// so these cover the shift and the local → UTC conversion directly.
import { describe, expect, it } from 'vitest'
import { toCreateSessionRequest } from '../api/mappers'
import { rebaseFixtures } from '../mocks/clock'
import { fixtureClock, rawFixtures } from '../mocks/fixtures'

const DAY_MS = 24 * 60 * 60 * 1000

describe('rebaseFixtures', () => {
  it('shifts every timestamp field by the same offset and leaves the input untouched', () => {
    const before = JSON.stringify(rawFixtures)
    const now = new Date(Date.parse(fixtureClock.referenceNow) + DAY_MS)
    const rebased = rebaseFixtures(rawFixtures, now)

    expect(JSON.stringify(rawFixtures)).toBe(before)
    const shifted = (original: string, next: string) => Date.parse(next) - Date.parse(original)

    rawFixtures.details.forEach((original, index) => {
      const next = rebased.details[index]
      expect(shifted(original.startsAt, next.startsAt)).toBe(DAY_MS)
      expect(shifted(original.createdAt, next.createdAt)).toBe(DAY_MS)
      expect(shifted(original.updatedAt, next.updatedAt)).toBe(DAY_MS)
      if (original.cancellation && next.cancellation) {
        expect(shifted(original.cancellation.cancelledAt, next.cancellation.cancelledAt)).toBe(DAY_MS)
      }
    })
    expect(rawFixtures.details.some((d) => d.cancellation !== null)).toBe(true)
    rawFixtures.sessions.data.forEach((original, index) => {
      expect(shifted(original.startsAt, rebased.sessions.data[index].startsAt)).toBe(DAY_MS)
    })
    expect(rebased.details[0].startsAt).toMatch(/Z$/)
  })
})

describe('toCreateSessionRequest', () => {
  it('converts local date and time to UTC and normalizes text', () => {
    const request = toCreateSessionRequest({
      title: '  U16 Rebounding Clinic ',
      type: 'camp',
      date: '2026-07-28',
      time: '18:00',
      durationMinutes: '90',
      capacity: '12',
      coachId: 'coach_01',
      locationName: ' North Court ',
      locationAddress: ' 18 Harbor Street ',
      visibility: 'invite-only',
      description: '   ',
      trainerNotes: ' Bring cones ',
    })
    expect(request).toEqual({
      title: 'U16 Rebounding Clinic',
      type: 'camp',
      startsAt: new Date(2026, 6, 28, 18, 0).toISOString(),
      durationMinutes: 90,
      coachId: 'coach_01',
      locationName: 'North Court',
      locationAddress: '18 Harbor Street',
      capacity: 12,
      visibility: 'invite-only',
      description: null,
      trainerNotes: 'Bring cones',
    })
  })
})
