// Stand-ins for the app code and framework modules the JS token routes import.
// check.ts maps each specifier below to this file and sets `globalThis.__ticketpingUser`.

export interface TestUser {
  id: number
  email: string
  name: string
}

const current = (): TestUser | null =>
  (globalThis as { __ticketpingUser?: TestUser | null }).__ticketpingUser ?? null

/** `@/auth` (Auth.js in Next.js) */
export async function auth() {
  const user = current()
  return user ? { user } : null
}

/** `@/lib/auth` (TanStack Start) */
export async function getCurrentUser(_request: Request) {
  return current()
}

/** `~/auth.server` (React Router) */
export async function getUser(_request: Request) {
  return current()
}

/** `$env/dynamic/private` (SvelteKit) */
export const env = process.env

/** `@tanstack/react-router` */
export const createFileRoute = (_path: string) => (options: unknown) => options
