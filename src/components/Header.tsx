'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig } from '@/lib/supabase'
import Logo from './Logo'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      if (!hasValidSupabaseConfig) {
        setAuthError(true)
        return
      }

      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Auth error:', error)
          setAuthError(true)
        } else {
          setUser(user)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        setAuthError(true)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  return (
    <header className="bg-sa-blue text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-bold">OB Sentinel</h1>
              <p className="text-sm opacity-90">South African Neighborhood Watch</p>
            </div>
          </div>

          {/* Authentication Status */}
          {authError && (
            <div className="bg-red-500 text-white px-3 py-1 rounded text-sm hidden md:block">
              ⚠️ Check environment variables
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <a 
                  href="/" 
                  className="hover:text-sa-green transition-colors font-medium"
                >
                  Dashboard
                </a>
                <a 
                  href="/alerts" 
                  className="hover:text-sa-green transition-colors font-medium"
                >
                  View Alerts
                </a>
                
                {/* Admin Links */}
                {user.email === 'riedwaan@multi-sound.co.za' && (
                  <>
                    <a 
                      href="/admin/logs" 
                      className="hover:text-sa-green transition-colors font-medium"
                    >
                      Admin Logs
                    </a>
                    <a 
                      href="/admin/logo" 
                      className="hover:text-sa-green transition-colors font-medium"
                    >
                      Upload Logo
                    </a>
                  </>
                )}

                {/* User Links */}
                <a 
                  href="/change-password" 
                  className="hover:text-sa-green transition-colors font-medium"
                >
                  Settings
                </a>
                
                {/* User Info & Logout */}
                <div className="flex items-center space-x-3 border-l border-sa-green pl-4 ml-2">
                  <span className="text-sm opacity-80">
                    {user.email || user.user_metadata?.name}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="bg-sa-red hover:bg-red-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <a 
                  href="/" 
                  className="hover:text-sa-green transition-colors font-medium"
                >
                  Home
                </a>
                <a 
                  href="/login" 
                  className="hover:text-sa-green transition-colors font-medium"
                >
                  Login
                </a>
                <a 
                  href="/register" 
                  className="bg-sa-green hover:bg-green-700 px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Register
                </a>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="md:hidden mt-4 pb-2 border-t border-blue-400 pt-4">
            {user ? (
              <div className="space-y-3">
                <a 
                  href="/" 
                  className="block hover:text-sa-green transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </a>
                <a 
                  href="/alerts" 
                  className="block hover:text-sa-green transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  View Alerts
                </a>
                
                {/* Admin Links */}
                {user.email === 'riedwaan@multi-sound.co.za' && (
                  <>
                    <a 
                      href="/admin/logs" 
                      className="block hover:text-sa-green transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Logs
                    </a>
                    <a 
                      href="/admin/logo" 
                      className="block hover:text-sa-green transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      Upload Logo
                    </a>
                  </>
                )}

                {/* User Links */}
                <a 
                  href="/change-password" 
                  className="block hover:text-sa-green transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </a>

                {/* User Info */}
                <div className="pt-2 border-t border-blue-400">
                  <p className="text-sm opacity-80 mb-3">
                    Signed in as: {user.email || user.user_metadata?.name}
                  </p>
                  <button 
                    onClick={() => {
                      handleLogout()
                      setMenuOpen(false)
                    }}
                    className="w-full bg-sa-red hover:bg-red-700 px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <a 
                  href="/" 
                  className="block hover:text-sa-green transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/login" 
                  className="block hover:text-sa-green transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </a>
                <a 
                  href="/register" 
                  className="block bg-sa-green hover:bg-green-700 px-4 py-2 rounded-lg transition-colors font-medium text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Register
                </a>
              </div>
            )}

            {/* Auth Error Mobile */}
            {authError && (
              <div className="bg-red-500 text-white px-3 py-2 rounded text-sm mt-3">
                ⚠️ Check environment variables
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}