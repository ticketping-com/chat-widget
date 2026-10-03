import { SignJWT } from 'jose'
import { auth } from '@/auth'

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export async function POST() {
  const session = await auth()
  const user = session?.user
  if (!user?.id) return new Response('Unauthorized', { status: 401 })

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
