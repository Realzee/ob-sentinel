import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import OnlinePresenceTracker from '@/components/OnlinePresenceTracker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rapid911 - Community Safety Reporting System',
  description: 'Real-time community safety reporting and alert system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}