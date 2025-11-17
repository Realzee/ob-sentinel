import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'RAPID iREPORT - Smart Reporting System',
  description: 'Modern, secure incident logging and community alert system for rapid reporting',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  keywords: ['crime reporting', 'community safety', 'incident logging', 'security alerts'],
  authors: [{ name: 'RAPID iREPORT' }],
  creator: 'RAPID iREPORT',
  publisher: 'RAPID iREPORT',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#D4AF37',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <ErrorBoundary>
          <Suspense 
            fallback={
              <div className="min-h-screen bg-dark-gray flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold"></div>
              </div>
            }
          >
            <Header />
            <main className="min-h-screen bg-dark-gray">
              {children}
            </main>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  )
}