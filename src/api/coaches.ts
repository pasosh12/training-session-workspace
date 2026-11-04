import { request } from './http'
import { toCoaches } from './mappers'
import type { Coach } from './types'

export async function listCoaches(opts: { signal?: AbortSignal } = {}): Promise<Coach[]> {
  return toCoaches(await request('GET', '/coaches', { signal: opts.signal }))
}
