'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig } from '@/lib/supabase'
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
      setError('Supabase not configured. Please check environment variables.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to add alerts')
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

      if (insertError) throw insertError

      setSuccess('Vehicle alert added successfully!')
      reset()
      
      // Mock WhatsApp notification
      console.log('📱 WHATSAPP ALERT MOCK:')
      console.log(`New vehicle alert: ${data.number_plate} - ${data.reason} in ${data.suburb}`)
      
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
      setError(error.message)
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
    <div className="bg-white rounded-xl shadow-md p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-red-100 p-2 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Report Stolen/Hijacked Vehicle</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {!hasValidSupabaseConfig && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          ⚠️ Supabase not configured. Form will not work until environment variables are set.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Number Plate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number Plate *
            </label>
            <input
              type="text"
              {...register('number_plate', { 
                required: 'Number plate is required',
                pattern: {
                  value: /^[A-Z0-9\s]{1,10}$/i,
                  message: 'Enter valid SA plate (e.g., CA 123 AB)'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
              placeholder="CA 123 AB"
              style={{ textTransform: 'uppercase' }}
            />
            {errors.number_plate && (
              <p className="text-red-600 text-sm mt-1">{errors.number_plate.message}</p>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color *
            </label>
            <input
              type="text"
              {...register('color', { required: 'Color is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
              placeholder="White, Black, Red, etc."
            />
            {errors.color && (
              <p className="text-red-600 text-sm mt-1">{errors.color.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Make */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Make *
            </label>
            <select
              {...register('make', { required: 'Make is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            >
              <option value="">Select vehicle make</option>
              {saVehicleMakes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
            {errors.make && (
              <p className="text-red-600 text-sm mt-1">{errors.make.message}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model *
            </label>
            <input
              type="text"
              {...register('model', { required: 'Model is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
              placeholder="Hilux, Polo, X3, etc."
            />
            {errors.model && (
              <p className="text-red-600 text-sm mt-1">{errors.model.message}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Incident Type / Reason *
          </label>
          <select
            {...register('reason', { required: 'Reason is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
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
            <p className="text-red-600 text-sm mt-1">{errors.reason.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SAPS Case Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SAPS Case Number
            </label>
            <input
              type="text"
              {...register('case_number')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
              placeholder="CAS 123/09/2023"
            />
          </div>

          {/* Suburb */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suburb / Area *
            </label>
            <select
              {...register('suburb', { required: 'Suburb is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            >
              <option value="">Select suburb</option>
              {saSuburbs.map(suburb => (
                <option key={suburb} value={suburb}>{suburb}</option>
              ))}
            </select>
            {errors.suburb && (
              <p className="text-red-600 text-sm mt-1">{errors.suburb.message}</p>
            )}
          </div>
        </div>

        {/* Images Checkbox */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            {...register('has_images')}
            className="w-4 h-4 text-sa-blue border-gray-300 rounded focus:ring-sa-blue"
          />
          <label className="text-sm font-medium text-gray-700">
            I have images of this vehicle (CCTV, photos, etc.)
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !hasValidSupabaseConfig}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Adding Alert...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>Report Stolen Vehicle</span>
            </>
          )}
        </button>

        <div className="text-center text-sm text-gray-500">
          <p>⚠️ This alert will be visible to all community members</p>
          <p>📱 WhatsApp notification will be sent to the community</p>
        </div>
      </form>
    </div>
  )
}