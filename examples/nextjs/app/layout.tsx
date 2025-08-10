import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ticketping Chat Widget - Next.js Example',
  description: 'Simple Next.js integration example for Ticketping Chat Widget',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
