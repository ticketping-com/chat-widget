import type { APIRoute } from 'astro'
import { SignJWT } from 'jose'

export const prerender = false

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user
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
