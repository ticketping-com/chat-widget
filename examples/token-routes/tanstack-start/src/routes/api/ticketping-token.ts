import { createFileRoute } from '@tanstack/react-router'
import { SignJWT } from 'jose'
import { getCurrentUser } from '@/lib/auth'

const secret = new TextEncoder().encode(process.env.TICKETPING_IDENTITY_SECRET)

export const Route = createFileRoute('/api/ticketping-token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getCurrentUser(request)
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
    }
  }
})
