import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'RAPID iREPORT - Smart Reporting System',
  description: 'Modern, secure incident logging and community alert system for rapid reporting',
  icons: {
    icon: './../public/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-primary-black text-primary-white">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}