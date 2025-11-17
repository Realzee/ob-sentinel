// components/Navigation.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-dark-gray border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-primary-white">
            Rapid911
          </Link>
          
          <div className="flex space-x-4">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md ${
                pathname === '/' 
                  ? 'bg-primary-red text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/alerts" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              Alerts
            </Link>
            <Link 
              href="/crimes" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
            >
              Crime Reports
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}