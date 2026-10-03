import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const profile: Record<string, string> = {}
  if (user.email) profile.email = user.email
  if (user.name) profile.name = user.name

  const token = await new SignJWT(profile)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setExpirationTime('5m')
    .sign(secret)

  setResponseHeader(event, 'Content-Type', 'text/plain')
  return token
})
