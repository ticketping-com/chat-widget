import type { IdentifyOptions } from '@ticketping/core'
import type { TicketpingApi } from '../api.ts'

/** The signed-in user of the host app, as adapters receive it. */
export interface TicketpingUser extends Omit<IdentifyOptions, 'userId' | 'getToken'> {
  userId?: string | number
  /** Alias for `userId`. Host apps often pass `{ id, email, name }`. */
  id?: string | number
}

/**
 * `undefined`: the host app is still loading its auth state, so nothing happens.
 * `null`: nobody is signed in; a previously identified user is logged out.
 */
export type UserInput = TicketpingUser | null | undefined

export type GetToken = () => Promise<string>

export interface UserSync {
  sync(user: UserInput): void
  reset(): void
}

/**
 * Makes the widget's identity follow the host app's user. A signed user (with `getToken`) is keyed
 * by `userId` alone, since the profile comes from the token; an unsigned one by the whole profile.
 */
export function createUserSync(api: TicketpingApi, getToken: () => GetToken | undefined): UserSync {
  let applied: string | null | undefined

  return {
    sync(user) {
      if (user === undefined) return
      if (user === null) {
        if (applied) void api.logout()
        applied = null
        return
      }
      const options = identifyOptions(user)
      const signed = options.userId !== undefined && getToken() !== undefined
      const key = signed ? `signed:${options.userId}` : `profile:${JSON.stringify(options)}`
      if (key === applied) return
      applied = key
      if (signed) {
        options.getToken = () => {
          const current = getToken()
          return current ? current() : Promise.reject(new Error('getToken was removed.'))
        }
      }
      void api.identify(options)
    },
    reset() {
      applied = undefined
    }
  }
}

function identifyOptions(user: TicketpingUser): IdentifyOptions {
  const { userId, id, ...profile } = user
  const resolved = userId ?? id
  return resolved === undefined ? profile : { ...profile, userId: String(resolved) }
}
