import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'RAPID iREPORT - Smart Reporting System',
  description: 'Modern, secure incident logging and community alert system for rapid reporting',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Header />
          <main className="min-h-screen bg-dark-gray">
            {children}
          </main>
        </ErrorBoundary>
      </body>
    </html>
  )
}