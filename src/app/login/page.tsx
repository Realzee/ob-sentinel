'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError

      if (authData.user) {
        router.push('/')
        router.refresh()
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-3xl font-bold text-center text-accent-gold mb-2">
        RAPID iREPORT
      </h1>
      <p className="text-center text-gray-400 mb-8">Smart Reporting System</p>

      <h2 className="text-2xl font-bold text-center text-primary-white mb-8">
        Sign In
      </h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            className="form-input"
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className="text-accent-red text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            {...register('password', { 
              required: 'Password is required'
            })}
            className="form-input"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="text-accent-red text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-gray-400 mt-6">
        Don't have an account?{' '}
        <Link href="/register" className="text-accent-gold hover:underline">
          Register here
        </Link>
      </p>

      <div className="mt-6 p-4 bg-medium-gray rounded-lg border border-gray-600">
        <p className="text-sm text-gray-300 text-center">
          <strong>Demo Access:</strong><br/>
          Register a new account to test the system
        </p>
      </div>
    </div>
  )
}