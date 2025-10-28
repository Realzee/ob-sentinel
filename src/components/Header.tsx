'use client'

import { useState, useEffect } from 'react'
import { supabase, isUsingPlaceholderCredentials } from '@/lib/supabase'
import Logo from './Logo'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      if (isUsingPlaceholderCredentials) {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-sa-blue text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Logo />
            <div>
              <h1 className="text-2xl font-bold">OB Sentinel</h1>
              <p className="text-sm opacity-90">South African Neighborhood Watch</p>
            </div>
          </div>
          
          {authError && (
            <div className="bg-red-500 text-white px-3 py-1 rounded text-sm">
              ⚠️ Check environment variables
            </div>
          )}
          
          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                <a href="/" className="hover:text-sa-green transition-colors">Dashboard</a>
                {user.email === 'riedwaan@multi-sound.co.za' && (
                  <>
                    <a href="/admin/logs" className="hover:text-sa-green transition-colors">Logs</a>
                    <a href="/admin/logo" className="hover:text-sa-green transition-colors">Logo</a>
                  </>
                )}
                <a href="/change-password" className="hover:text-sa-green transition-colors">Settings</a>
                <button 
                  onClick={handleLogout}
                  className="bg-sa-red hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <a href="/" className="hover:text-sa-green transition-colors">Home</a>
                <a href="/login" className="hover:text-sa-green transition-colors">Login</a>
                <a href="/register" className="bg-sa-green hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
                  Register
                </a>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}