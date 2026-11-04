// User-visible copy from ui-design §6 and §7, resolved by failure kind and then code.
import type { ApiFailure } from '../../api/errors'

export interface FailureCopy {
  title: string
  body: string
}

export type FailureArea = 'list' | 'details' | 'coaches'

export function failureCopy(area: FailureArea, failure: ApiFailure): FailureCopy {
  if (area === 'list') {
    if (failure.kind === 'network') {
      return { title: "Sessions couldn't load", body: 'The connection failed. Check your network connection, then try again.' }
    }
    if (failure.kind === 'contract') {
      return {
        title: "Sessions couldn't be shown",
        body: "The server sent data the workspace can't read. Try again. If this keeps happening, report it to support.",
      }
    }
    if (failure.code === 'INVALID_FILTER') {
      return {
        title: "These filters can't be applied",
        body: "The server didn't accept the current search or status. Clear the filters and try again.",
      }
    }
    if (failure.code === 'SESSIONS_UNAVAILABLE') {
      return { title: "Sessions couldn't load", body: "Sessions can't be loaded right now. Try again in a moment." }
    }
    return { title: "Sessions couldn't load", body: `${failure.message} Try again in a moment.` }
  }

  if (area === 'details') {
    if (failure.kind === 'network') {
      return { title: "Details couldn't load", body: 'The connection failed. Check your network connection, then try again.' }
    }
    if (failure.kind === 'contract') {
      return {
        title: "Details couldn't be shown",
        body: "The server sent data the workspace can't read. Try again, or go back to the list.",
      }
    }
    if (failure.code === 'SESSION_NOT_FOUND') {
      return {
        title: 'Session not found',
        body: "This session doesn't exist. It may have been removed, or the link may be wrong.",
      }
    }
    if (failure.code === 'SESSION_DETAILS_UNAVAILABLE') {
      return {
        title: "Details couldn't load",
        body: "Session details can't be loaded right now. Try again, or go back to the list.",
      }
    }
    return { title: "Details couldn't load", body: `${failure.message} Try again, or go back to the list.` }
  }

  if (failure.kind === 'network') {
    return { title: '', body: 'The connection failed while loading coaches. Check your connection, then try again.' }
  }
  if (failure.kind === 'http' && failure.code === 'COACHES_UNAVAILABLE') {
    return {
      title: '',
      body: "Coaches couldn't load, so a coach can't be chosen yet. Try again. Your other entries are kept.",
    }
  }
  return { title: '', body: "Coaches couldn't be shown. Try again." }
}

export function isNotFound(failure: ApiFailure): boolean {
  return failure.kind === 'http' && failure.code === 'SESSION_NOT_FOUND'
}

export interface CreateFailureCopy {
  message: string
  /** Network/contract outcomes are uncertain: offer a list check before resubmitting. */
  uncertain: boolean
}

export function createFailureCopy(failure: ApiFailure, hasMappedFields: boolean): CreateFailureCopy {
  if (failure.kind === 'network') {
    return {
      message:
        'The connection failed before the server confirmed the session. It may or may not have been created. Check the sessions list before submitting again to avoid a duplicate.',
      uncertain: true,
    }
  }
  if (failure.kind === 'contract') {
    return {
      message:
        "The server responded, but its reply couldn't be read. The session may have been created. Check the sessions list before submitting again.",
      uncertain: true,
    }
  }
  if (failure.code === 'VALIDATION_FAILED') {
    return hasMappedFields
      ? { message: "The session wasn't created. Fix the highlighted fields, then submit again.", uncertain: false }
      : { message: `The session wasn't created: ${failure.message} Check the form, then submit again.`, uncertain: false }
  }
  if (failure.code === 'CREATE_SESSION_FAILED') {
    return { message: "The session couldn't be created. Your entries are kept. Submit again to retry.", uncertain: false }
  }
  return { message: `The session wasn't created: ${failure.message}`, uncertain: false }
}

export function sessionCount(n: number): string {
  return n === 1 ? '1 session' : `${n} sessions`
}
