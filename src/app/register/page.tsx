'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RegisterForm {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  popiaConsent: boolean
}

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()
  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setError('')

    try {
      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            phone: data.phone
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Insert user profile with POPIA consent
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: data.email,
              phone: data.phone,
              name: data.name,
              popia_consent: data.popiaConsent,
              consent_given_at: data.popiaConsent ? new Date().toISOString() : null
            }
          ])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Continue anyway as auth user is created
        }

        // Log the registration action
        await supabase
          .from('user_logs')
          .insert([
            {
              user_id: authData.user.id,
              action: 'registration',
              ip_address: '',
              user_agent: navigator.userAgent
            }
          ])

        // Check if this is the first user (admin)
        const { data: userCount } = await supabase
          .from('users')
          .select('id', { count: 'exact' })

        if (userCount && userCount.length === 1) {
          // First user becomes admin
          await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', authData.user.id)
        }

        router.push('/?message=check-email')
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
        Join Rapid911
      </h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            {...register('name', { required: 'Name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            {...register('phone', { required: 'Phone number is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            placeholder="+27 82 123 4567"
          />
          {errors.phone && (
            <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <input
            type="password"
            {...register('password', { 
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            {...register('confirmPassword', { 
              required: 'Please confirm your password',
              validate: value => value === password || 'Passwords do not match'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              {...register('popiaConsent', { 
                required: 'You must consent to POPIA compliance' 
              })}
              className="mt-1"
            />
            <div>
              <label className="text-sm font-medium text-gray-700">
                POPIA Compliance Consent
              </label>
              <p className="text-sm text-gray-600 mt-1">
                I consent to the processing of my personal information in compliance 
                with the Protection of Personal Information Act (POPIA). I understand 
                that my data will be used solely for community safety purposes and 
                will be protected according to POPIA guidelines.
              </p>
            </div>
          </div>
          {errors.popiaConsent && (
            <p className="text-red-600 text-sm mt-2">{errors.popiaConsent.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary inline-flex items-center space-x-2"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-sa-blue hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}