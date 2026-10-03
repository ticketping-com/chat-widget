import { env } from '$env/dynamic/private'
import { SignJWT } from 'jose'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ locals }) => {
  const user = locals.user
  if (!user) return new Response('Unauthorized', { status: 401 })

  const profile: Record<string, string> = {}
  if (user.email) profile.email = user.email
  if (user.name) profile.name = user.name

  const token = await new SignJWT(profile)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(env.TICKETPING_IDENTITY_SECRET))

  return new Response(token, { headers: { 'Content-Type': 'text/plain' } })
}
