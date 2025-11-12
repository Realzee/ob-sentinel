// components/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, LogOut, Settings, Shield, AlertTriangle } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowDropdown(false)
  }

  return (
    <header className="bg-dark-gray border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/rapid911-ireport-logo2.png"
              alt="Rapid Rangers Logo"
              className="w-12 h-12"
            />
            <div>
              <h1 className="text-2xl font-bold text-primary-white">Rapid Rangers</h1>
              <p className="text-sm text-gray-400">Community Safety Reporting</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-white">
                      {userProfile?.name || user.email}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {userProfile?.role}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-accent-gold rounded-full flex items-center justify-center text-black font-bold">
                    {userProfile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                        Signed in as {user.email}
                      </div>
                      
                      {userProfile?.role === 'admin' && (
                        <a
                          href="/admin/users"
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Panel</span>
                        </a>
                      )}
                      
                      <a
                        href="/profile"
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile</span>
                      </a>
                      
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-3">
                <a
                  href="/login"
                  className="btn-primary flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}