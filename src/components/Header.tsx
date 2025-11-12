'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  name: string | null
  approved: boolean
  role: 'user' | 'moderator' | 'admin'
  last_login: string | null
  created_at: string
  updated_at: string
}

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authError, setAuthError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      if (!hasValidSupabaseConfig) {
        setAuthError(true)
        setAuthLoading(false)
        return
      }

      try {
        // Get current user with improved error handling
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        
        if (currentUser) {
          const profile = await getCurrentUserProfile()
          setUserProfile(profile)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthError(true)
      } finally {
        setAuthLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state listener with better error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
          setAuthError(false)
          if (session?.user) {
            const profile = await getCurrentUserProfile()
            setUserProfile(profile)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        } else if (event === 'USER_UPDATED') {
          setUser(session?.user ?? null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      } else {
        setUser(null)
        setUserProfile(null)
        setAuthError(false)
        // Force page refresh to reset state
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  // Show loading state
  if (authLoading) {
    return (
      <header className="bg-dark-gray border-b border-gray-700 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-left space-x-4">
              {/* Simple logo container without background */}
              <div className="flex flex-col items-left justify-left">
                <img 
            src="/rapid911-ireport-logo1.png"
            alt="Rapid911 Logo" 
            className="w-30 h-auto"
          />
          <p className="text-sm flashing-text flashing-text">Smart Reporting System</p>
              </div>
              <div>
              </div>
            </div>
            <div className="text-sm text-gray-400">Loading...</div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-dark-gray border-b border-gray-700 shadow-xl">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand - Logo without container */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-left justify-center">
                <img 
                  src="/rapid911-ireport-logo1.png"
                  alt="Rapid911 Logo" 
                  className="w-30 h-auto"
            />
            <p className="text-sm flashing-text flashing-text">Smart Reporting System</p>
            </div>
            
          </div>

          {/* Authentication Status */}
          {authError && (
            <div className="bg-red-900 text-red-300 px-3 py-1 rounded text-sm hidden md:block">
              ⚠️ Authentication issue
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <a 
                  href="/" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  Dashboard
                </a>
                <a 
                  href="/alerts" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  View Reports
                </a>
                <a 
                  href="/bolo-generator" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  BOLO Generator
                </a>
                
                {/* Admin Links - Only show for approved admins/moderators */}
                {userProfile && (userProfile.role === 'admin' || userProfile.role === 'moderator') && userProfile.approved && (
                  <>
                    <a 
                      href="/admin/users" 
                      className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                    >
                      User Management
                    </a>
                    <a 
                      href="/admin/logs" 
                      className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                    >
                      System Logs
                    </a>
                  </>
                )}

                {/* User Links */}
                <a 
                  href="/change-password" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  Settings
                </a>
                
                {/* User Info & Logout */}
                <div className="flex items-center space-x-4 border-l border-gray-600 pl-4 ml-2">
                  <div className="text-right">
                    <span className="text-sm text-gray-400 max-w-xs truncate block">
                      {userProfile?.name || user.email || user.user_metadata?.name}
                    </span>
                    {userProfile && !userProfile.approved && (
                      <span className="text-xs text-yellow-400 block">Pending Approval</span>
                    )}
                    {userProfile && (
                      <span className="text-xs text-gray-500 capitalize block">{userProfile.role}</span>
                    )}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="btn-primary text-sm"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <a 
                  href="/" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  Home
                </a>
                <a 
                  href="/login" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                >
                  Login
                </a>
                <a 
                  href="/register" 
                  className="btn-primary"
                >
                  Get Started
                </a>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-medium-gray transition-colors"
            onClick={toggleMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-2 border-t border-gray-600 pt-4">
            {user ? (
              <div className="space-y-3">
                <a 
                  href="/" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </a>
                <a 
                  href="/alerts" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  View Reports
                </a>
                <a 
                  href="/bolo-generator" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  BOLO Generator
                </a>
                
                {/* Admin Links - Mobile */}
                {userProfile && (userProfile.role === 'admin' || userProfile.role === 'moderator') && userProfile.approved && (
                  <>
                    <a 
                      href="/admin/users" 
                      className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      User Management
                    </a>
                    <a 
                      href="/admin/logs" 
                      className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      System Logs
                    </a>
                  </>
                )}

                {/* User Links */}
                <a 
                  href="/change-password" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </a>

                {/* User Info */}
                <div className="pt-2 border-t border-gray-600">
                  <p className="text-sm text-gray-400 mb-1 truncate">
                    Signed in as: {userProfile?.name || user.email || user.user_metadata?.name}
                  </p>
                  {userProfile && !userProfile.approved && (
                    <p className="text-xs text-yellow-400 mb-2">Pending Approval</p>
                  )}
                  {userProfile && (
                    <p className="text-xs text-gray-500 capitalize mb-3">{userProfile.role}</p>
                  )}
                  <button 
                    onClick={() => {
                      handleLogout()
                      setMenuOpen(false)
                    }}
                    className="w-full btn-primary"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <a 
                  href="/" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/login" 
                  className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </a>
                <a 
                  href="/register" 
                  className="block btn-primary text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </a>
              </div>
            )}

            {/* Auth Error Mobile */}
            {authError && (
              <div className="bg-red-900 text-red-300 px-3 py-2 rounded text-sm mt-3">
                ⚠️ Authentication issue
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}