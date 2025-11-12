'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase'
import { ChevronDown, Users, Shield, FileText, Car, AlertTriangle } from 'lucide-react'

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
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false)
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setReportsDropdownOpen(false)
        setAdminDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let authSubscription: any = null

    const initializeAuth = async () => {
      if (!hasValidSupabaseConfig) {
        console.warn('Supabase not configured')
        if (mounted) {
          setAuthError(true)
          setAuthLoading(false)
        }
        return
      }

      try {
        // Get initial user state
        const currentUser = await getCurrentUser()
        console.log('Initial user:', currentUser)
        
        if (mounted) {
          setUser(currentUser)
          
          if (currentUser) {
            try {
              const profile = await getCurrentUserProfile()
              console.log('Initial profile:', profile)
              setUserProfile(profile)
            } catch (profileError) {
              console.warn('Initial profile fetch failed:', profileError)
              // Continue without profile - it might be created later
            }
          }
          setAuthLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setAuthError(true)
          setAuthLoading(false)
        }
      }
    }

    initializeAuth()

    // Set up auth state listener
    authSubscription = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user)
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          setAuthError(false)
          
          if (currentUser) {
            try {
              const profile = await getCurrentUserProfile()
              console.log('Profile after auth change:', profile)
              setUserProfile(profile)
            } catch (error) {
              console.warn('Profile fetch failed after auth change:', error)
              setUserProfile(null)
            }
          } else {
            setUserProfile(null)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
          setAuthError(false)
        }
        
        if (mounted && authLoading) {
          setAuthLoading(false)
        }
      }
    )

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted && authLoading) {
        console.warn('Auth loading timeout - forcing state to false')
        setAuthLoading(false)
      }
    }, 10000) // 10 second timeout

    return () => {
      mounted = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
      clearTimeout(loadingTimeout)
    }
  }, [authLoading])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      } else {
        setUser(null)
        setUserProfile(null)
        setAuthError(false)
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const canAccessAdmin = userProfile && (userProfile.role === 'admin' || userProfile.role === 'moderator') && userProfile.approved

  // Show loading state only for a reasonable time
  if (authLoading) {
    return (
      <header className="bg-dark-gray border-b border-gray-700 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-left space-x-4">
              <div className="flex flex-col items-left justify-left">
                <img 
                  src="/rapid911-ireport-logo1.png"
                  alt="Rapid911 Logo" 
                  className="w-30 h-auto"
                />
                <p className="text-sm flashing-text">Smart Reporting System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-gold"></div>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-dark-gray border-b border-gray-700 shadow-xl">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-left justify-center">
              <img 
                src="/rapid911-ireport-logo1.png"
                alt="Rapid911 Logo" 
                className="w-30 h-auto"
              />
              <p className="text-sm flashing-text">Smart Reporting System</p>
            </div>
          </div>

          {/* Authentication Status */}
          {authError && (
            <div className="bg-red-900 text-red-300 px-3 py-1 rounded text-sm hidden md:block">
              ⚠️ Authentication issue
            </div>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <a 
                  href="/" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium flex items-center space-x-1"
                >
                  <FileText className="w-4 h-4" />
                  <span>Dashboard</span>
                </a>

                {/* Reports Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setReportsDropdownOpen(!reportsDropdownOpen)}
                    className="text-gray-300 hover:text-accent-gold transition-colors font-medium flex items-center space-x-1"
                  >
                    <Car className="w-4 h-4" />
                    <span>Reports</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {reportsDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50">
                      <a 
                        href="/alerts" 
                        className="flex items-center space-x-2 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-accent-gold transition-colors border-b border-gray-700"
                        onClick={() => setReportsDropdownOpen(false)}
                      >
                        <Car className="w-4 h-4" />
                        <span>View All Reports</span>
                      </a>
                      <a 
                        href="/bolo-generator" 
                        className="flex items-center space-x-2 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-accent-gold transition-colors"
                        onClick={() => setReportsDropdownOpen(false)}
                      >
                        <FileText className="w-4 h-4" />
                        <span>BOLO Generator</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Dropdown - Only show for approved admins/moderators */}
                {canAccessAdmin && (
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                      className="text-gray-300 hover:text-accent-gold transition-colors font-medium flex items-center space-x-1"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    
                    {adminDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50">
                        <a 
                          href="/admin/users" 
                          className="flex items-center space-x-2 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-accent-gold transition-colors border-b border-gray-700"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          <Users className="w-4 h-4" />
                          <span>User Management</span>
                        </a>
                        <a 
                          href="/admin/logs" 
                          className="flex items-center space-x-2 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-accent-gold transition-colors"
                          onClick={() => setAdminDropdownOpen(false)}
                        >
                          <FileText className="w-4 h-4" />
                          <span>System Logs</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* User Settings */}
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
                      {userProfile?.name || user.email || user.user_metadata?.name || 'User'}
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
                  className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition-colors font-medium py-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <FileText className="w-4 h-4" />
                  <span>Dashboard</span>
                </a>

                {/* Mobile Reports Section */}
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-sm text-gray-400 mb-2 font-medium">REPORTS</p>
                  <a 
                    href="/alerts" 
                    className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition-colors py-2 pl-4"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Car className="w-4 h-4" />
                    <span>View All Reports</span>
                  </a>
                  <a 
                    href="/bolo-generator" 
                    className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition-colors py-2 pl-4"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FileText className="w-4 h-4" />
                    <span>BOLO Generator</span>
                  </a>
                </div>

                {/* Mobile Admin Section */}
                {canAccessAdmin && (
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-sm text-gray-400 mb-2 font-medium">ADMIN</p>
                    <a 
                      href="/admin/users" 
                      className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition-colors py-2 pl-4"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Users className="w-4 h-4" />
                      <span>User Management</span>
                    </a>
                    <a 
                      href="/admin/logs" 
                      className="flex items-center space-x-2 text-gray-300 hover:text-accent-gold transition-colors py-2 pl-4"
                      onClick={() => setMenuOpen(false)}
                    >
                      <FileText className="w-4 h-4" />
                      <span>System Logs</span>
                    </a>
                  </div>
                )}

                {/* Mobile User Settings */}
                <div className="border-t border-gray-700 pt-3">
                  <a 
                    href="/change-password" 
                    className="text-gray-300 hover:text-accent-gold transition-colors font-medium py-2 block"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </a>
                </div>

                {/* Mobile User Info */}
                <div className="pt-3 border-t border-gray-600">
                  <p className="text-sm text-gray-400 mb-1 truncate">
                    Signed in as: {userProfile?.name || user.email || user.user_metadata?.name || 'User'}
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
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium py-2 block"
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/login" 
                  className="text-gray-300 hover:text-accent-gold transition-colors font-medium py-2 block"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </a>
                <a 
                  href="/register" 
                  className="btn-primary text-center block"
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