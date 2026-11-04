import { listCoaches } from '../../../api/coaches'
import type { Coach } from '../model'
import { useAsyncResource } from '../hooks/useAsyncResource'

/** Fetched only while the create drawer is open. */
export function useCoaches(enabled: boolean) {
  return useAsyncResource<Coach[]>((signal) => listCoaches({ signal }), [], { enabled })
}
