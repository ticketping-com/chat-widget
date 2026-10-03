import { SignJWT } from 'jose'
import { getUser } from '~/auth.server'
import type { Route } from './+types/api.ticketping-token'

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export async function action({ request }: Route.ActionArgs) {
  const user = await getUser(request)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const profile: Record<string, string> = {}
  if (user.email) profile.email = user.email
  if (user.name) profile.name = user.name

  const token = await new SignJWT(profile)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setExpirationTime('5m')
    .sign(secret)

  return new Response(token, { headers: { 'Content-Type': 'text/plain' } })
}
