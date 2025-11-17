// app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff, User, Lock, AlertCircle, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('✅ User already logged in, redirecting to dashboard')
        router.push('/')
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (error) {
        throw error
      }

      if (data.user) {
        console.log('✅ Login successful, redirecting to dashboard')
        setSuccess('Login successful! Redirecting...')
        
        // Short delay to show success message
        setTimeout(() => {
          router.push('/')
          router.refresh() // Refresh to update auth state
        }, 1000)
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoType: 'user' | 'admin') => {
    setLoading(true)
    setError('')
    setSuccess('')

    const demoCredentials = {
      user: { email: 'demo@rapid911.com', password: 'demo123' },
      admin: { email: 'admin@rapid911.com', password: 'admin123' }
    }

    const credentials = demoCredentials[demoType]

    try {
      setEmail(credentials.email)
      
      const { data, error } = await supabase.auth.signInWithPassword(credentials)

      if (error) {
        throw error
      }

      if (data.user) {
        console.log(`✅ ${demoType} demo login successful, redirecting to dashboard`)
        setSuccess(`${demoType === 'admin' ? 'Admin' : 'User'} demo login successful! Redirecting...`)
        
        setTimeout(() => {
          router.push('../dashboard')
          router.refresh()
        }, 1000)
      }
    } catch (error: any) {
      console.error('Demo login error:', error)
      setError(error.message || 'Demo login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-gray flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/rapid911-ireport-logo2.png"
            alt="Rapid911 Logo"
            className="w-30 h-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Community Safety Reporting System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 sm:px-10">
          {error && (
            <div className="mb-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded flex items-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>{success}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex justify-center items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : null}
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-gray text-gray-400">Demo Accounts</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('user')}
                disabled={loading}
                className="btn-primary flex justify-center items-center space-x-2 disabled:opacity-50"
              >
                <User className="w-4 h-4" />
                <span>User Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex justify-center items-center space-x-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>Admin Demo</span>
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-blue-900 border border-blue-700 text-blue-300 p-3 rounded text-sm">
              <p className="font-medium mb-1">⚠️ Important Security Notice</p>
              <p>This is a demonstration system. Use the demo accounts above to explore features.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}