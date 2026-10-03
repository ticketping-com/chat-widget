import process from 'node:process'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export async function ticketpingToken(req, res) {
  const user = req.user
  if (!user) return res.sendStatus(401)

  const profile = {}
  if (user.email) profile.email = user.email
  if (user.name) profile.name = user.name

  const token = await new SignJWT(profile)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setExpirationTime('5m')
    .sign(secret)

  res.type('text/plain').send(token)
}
