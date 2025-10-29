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
    <header className="bg-dark-gray border-b border-gray-700 shadow-xl">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-bold bg-gold-gradient bg-clip-text text-transparent">
                RAPID iREPORT
              </h1>
              <p className="text-sm text-gray-300">Smart Reporting System</p>
            </div>
          </div>

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
                
                {/* Admin Links */}
                {user.email === 'riedwaan@multi-sound.co.za' && (
                  <>
                    <a 
                      href="/admin/logs" 
                      className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                    >
                      Admin Logs
                    </a>
                    <a 
                      href="/admin/logo" 
                      className="text-gray-300 hover:text-accent-gold transition-colors font-medium"
                    >
                      Branding
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
                  <span className="text-sm text-gray-400">
                    {user.email || user.user_metadata?.name}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="btn-outline text-sm"
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
                
                {/* Admin Links */}
                {user.email === 'riedwaan@multi-sound.co.za' && (
                  <>
                    <a 
                      href="/admin/logs" 
                      className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Logs
                    </a>
                    <a 
                      href="/admin/logo" 
                      className="block text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      Branding
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
                  <p className="text-sm text-gray-400 mb-3">
                    Signed in as: {user.email || user.user_metadata?.name}
                  </p>
                  <button 
                    onClick={() => {
                      handleLogout()
                      setMenuOpen(false)
                    }}
                    className="w-full btn-outline"
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
          </div>
        )}
      </div>
    </header>
  )
}