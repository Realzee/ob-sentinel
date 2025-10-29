'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
import { Plus, AlertTriangle, Car } from 'lucide-react'

interface AlertForm {
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  suburb: string
  has_images: boolean
}

export default function AddAlertForm({ onAlertAdded }: { onAlertAdded?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlertForm>()

  const onSubmit = async (data: AlertForm) => {
    if (!hasValidSupabaseConfig) {
      setError('System not configured. Please check environment variables.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to file reports')
        return
      }

      // Ensure user exists in database
      const dbUser = await ensureUserExists(user.id, {
        email: user.email!,
        name: user.user_metadata?.name
      })

      if (!dbUser) {
        setError('Unable to verify your account. Please try logging in again.')
        return
      }

      // Insert new alert
      const { error: insertError } = await supabase
        .from('alerts_vehicles')
        .insert([
          {
            user_id: user.id,
            number_plate: data.number_plate.toUpperCase().replace(/\s/g, ''),
            color: data.color,
            make: data.make,
            model: data.model,
            reason: data.reason,
            case_number: data.case_number,
            suburb: data.suburb,
            has_images: data.has_images
          }
        ])

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      setSuccess('Report filed successfully! Community alerted.')
      reset()
      
      // Mock WhatsApp notification
      console.log('📱 RAPID ALERT MOCK:')
      console.log(`New report: ${data.number_plate} - ${data.reason} in ${data.suburb}`)
      
      // Callback to refresh alerts
      if (onAlertAdded) {
        onAlertAdded()
      }

      // Log the action
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'create_alert',
            ip_address: '',
            user_agent: navigator.userAgent
          }
        ])

    } catch (error: any) {
      console.error('Form submission error:', error)
      setError(error.message || 'Failed to file report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Common South African vehicle makes
  const saVehicleMakes = [
    'Toyota', 'Volkswagen', 'Ford', 'Nissan', 'BMW', 'Mercedes-Benz',
    'Hyundai', 'Kia', 'Isuzu', 'Mazda', 'Honda', 'Audi', 'Suzuki',
    'Renault', 'Chevrolet', 'Mitsubishi', 'Volvo', 'Land Rover', 'Other'
  ]

  // Common South African suburbs for suggestions
  const saSuburbs = [
    'Sandton', 'Randburg', 'Fourways', 'Midrand', 'Pretoria', 'Centurion',
    'Johannesburg CBD', 'Rosebank', 'Parkhurst', 'Greenside', 'Edenvale',
    'Bedfordview', 'Bryanston', 'Hyde Park', 'Illovo', 'Melville', 'Other'
  ]

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-accent-red p-2 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-primary-white" />
        </div>
        <h2 className="text-2xl font-bold text-primary-white">File Rapid Report</h2>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!hasValidSupabaseConfig && (
        <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 px-4 py-3 rounded mb-4">
          ⚠️ System not configured. Form will not work until environment variables are set.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Number Plate */}
          <div>
            <label htmlFor="number_plate" className="block text-sm font-medium text-gray-300 mb-2">
              Number Plate *
            </label>
            <input
              type="text"
              id="number_plate"
              {...register('number_plate', { 
                required: 'Number plate is required',
                pattern: {
                  value: /^[A-Z0-9\s]{1,10}$/i,
                  message: 'Enter valid SA plate (e.g., CA 123 AB)'
                }
              })}
              className="form-input"
              placeholder="CA 123 AB"
              style={{ textTransform: 'uppercase' }}
            />
            {errors.number_plate && (
              <p className="text-accent-red text-sm mt-1">{errors.number_plate.message}</p>
            )}
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-300 mb-2">
              Color *
            </label>
            <input
              type="text"
              id="color"
              {...register('color', { required: 'Color is required' })}
              className="form-input"
              placeholder="White, Black, Red, etc."
            />
            {errors.color && (
              <p className="text-accent-red text-sm mt-1">{errors.color.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Make */}
          <div>
            <label htmlFor="make" className="block text-sm font-medium text-gray-300 mb-2">
              Make *
            </label>
            <select
              id="make"
              {...register('make', { required: 'Make is required' })}
              className="form-input"
            >
              <option value="">Select vehicle make</option>
              {saVehicleMakes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
            {errors.make && (
              <p className="text-accent-red text-sm mt-1">{errors.make.message}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-300 mb-2">
              Model *
            </label>
            <input
              type="text"
              id="model"
              {...register('model', { required: 'Model is required' })}
              className="form-input"
              placeholder="Hilux, Polo, X3, etc."
            />
            {errors.model && (
              <p className="text-accent-red text-sm mt-1">{errors.model.message}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
            Incident Type / Reason *
          </label>
          <select
            id="reason"
            {...register('reason', { required: 'Reason is required' })}
            className="form-input"
          >
            <option value="">Select incident type</option>
            <option value="Stolen vehicle">Stolen Vehicle</option>
            <option value="Hijacked vehicle">Hijacked Vehicle</option>
            <option value="Suspicious activity">Suspicious Activity</option>
            <option value="Break-in attempt">Break-in Attempt</option>
            <option value="Armed robbery">Armed Robbery</option>
            <option value="Other">Other</option>
          </select>
          {errors.reason && (
            <p className="text-accent-red text-sm mt-1">{errors.reason.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SAPS Case Number */}
          <div>
            <label htmlFor="case_number" className="block text-sm font-medium text-gray-300 mb-2">
              SAPS Case Number
            </label>
            <input
              type="text"
              id="case_number"
              {...register('case_number')}
              className="form-input"
              placeholder="CAS 123/09/2023"
            />
          </div>

          {/* Suburb */}
          <div>
            <label htmlFor="suburb" className="block text-sm font-medium text-gray-300 mb-2">
              Suburb / Area *
            </label>
            <select
              id="suburb"
              {...register('suburb', { required: 'Suburb is required' })}
              className="form-input"
            >
              <option value="">Select suburb</option>
              {saSuburbs.map(suburb => (
                <option key={suburb} value={suburb}>{suburb}</option>
              ))}
            </select>
            {errors.suburb && (
              <p className="text-accent-red text-sm mt-1">{errors.suburb.message}</p>
            )}
          </div>
        </div>

        {/* Images Checkbox */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="has_images"
            {...register('has_images')}
            className="w-4 h-4 text-accent-gold bg-dark-gray border-gray-600 rounded focus:ring-accent-gold focus:ring-2"
          />
          <label htmlFor="has_images" className="text-sm font-medium text-gray-300">
            I have images of this vehicle (CCTV, photos, etc.)
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !hasValidSupabaseConfig}
          className="w-full btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Filing Report...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>Submit Rapid Report</span>
            </>
          )}
        </button>

        <div className="text-center text-sm text-gray-500">
          <p>⚠️ This report will be visible to all community members</p>
          <p>📱 Instant alerts will be sent to the community network</p>
        </div>
      </form>
    </div>
  )
}