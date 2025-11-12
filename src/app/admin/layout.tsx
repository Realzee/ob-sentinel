// app/admin/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Home, Shield } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const goToDashboard = () => {
    router.push('/')
  }

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    }

    checkAdminAccess()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
          <p className="text-gray-400">Checking admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-gray">
      {/* Admin Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToDashboard}
                className="flex items-center space-x-2 text-accent-gold hover:text-yellow-400 transition-colors p-2 rounded-lg hover:bg-gray-700"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <div className="flex items-center space-x-2 text-primary-white">
                <Shield className="w-5 h-5 text-accent-gold" />
                <span className="font-semibold">Admin Panel</span>
              </div>
            </div>
            
            {/* Admin Navigation */}
            <div className="flex items-center space-x-4">
              <a
                href="/admin/users"
                className="text-gray-300 hover:text-accent-gold transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                User Management
              </a>
              {/* Add more admin links here as needed */}
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}