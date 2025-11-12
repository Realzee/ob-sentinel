// components/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { getSafeUserProfile, supabase } from '@/lib/supabase'
import { User, LogOut, Shield, Menu, X } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const profile = await getSafeUserProfile(user.id)
      setUserProfile(profile)
    }
  }
  getUser()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    setUser(session?.user ?? null)
    if (session?.user) {
      const profile = await getSafeUserProfile(session.user.id)
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
    setMobileMenuOpen(false)
  }

  return (
    <header className="bg-dark-gray border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo - Fixed alignment */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <img 
                src="/rapid911-ireport-logo1.png"
                alt="Rapid911 Logo" 
                className="w-30 h-auto"
              />
              <p className="text-sm flashing-text text-blue-900 mt-1">
                Smart Reporting System
              </p>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-white">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2">
                      {userProfile?.name && (
                        <p className="text-xs text-accent-gold">
                          {userProfile.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 capitalize">
                        {userProfile?.role}
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-accent-gold rounded-full flex items-center justify-center text-black font-bold">
                    {userProfile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm text-gray-400 border-b border-gray-700">
                        <div className="font-medium text-primary-white">{user.email}</div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-accent-gold">{userProfile?.name}</span>
                          <span className="text-gray-400 capitalize">{userProfile?.role}</span>
                        </div>
                      </div>
                      
                      {/* Show Admin Panel for Admin and Moderator roles */}
                      {(userProfile?.role === 'admin' || userProfile?.role === 'moderator') && (
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
                        onClick={() => setShowDropdown(false)}
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700 pt-4 pb-4">
            {user ? (
              <div className="space-y-3">
                <div className="text-center text-gray-400 pb-2 border-b border-gray-700">
                  <div className="font-medium text-primary-white">{user.email}</div>
                  <div className="flex justify-center items-center space-x-4 mt-1">
                    {userProfile?.name && (
                      <span className="text-accent-gold text-sm">{userProfile.name}</span>
                    )}
                    <span className="text-gray-400 text-sm capitalize">{userProfile?.role}</span>
                  </div>
                </div>
                
                {(userProfile?.role === 'admin' || userProfile?.role === 'moderator') && (
                  <a
                    href="/admin/users"
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </a>
                )}
                
                <a
                  href="/profile"
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
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
            ) : (
              <div className="space-y-3">
                <a
                  href="/login"
                  className="btn-primary flex items-center justify-center space-x-2 w-full"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .flashing-text {
          animation: flash 2s infinite;
        }
      `}</style>
    </header>
  )
}