'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, X } from 'lucide-react'

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

interface EditAlertFormProps {
  alert: any
  onAlertUpdated: () => void
  onCancel: () => void
}

export default function EditAlertForm({ alert, onAlertUpdated, onCancel }: EditAlertFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const { register, handleSubmit, formState: { errors } } = useForm<AlertForm>({
    defaultValues: {
      number_plate: alert.number_plate,
      color: alert.color,
      make: alert.make,
      model: alert.model,
      reason: alert.reason,
      case_number: alert.case_number || '',
      suburb: alert.suburb,
      has_images: alert.has_images
    }
  })

  const onSubmit = async (data: AlertForm) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to edit reports')
        return
      }

      // Update alert
      const { error: updateError } = await supabase
        .from('alerts_vehicles')
        .update({
          number_plate: data.number_plate.toUpperCase().replace(/\s/g, ''),
          color: data.color,
          make: data.make,
          model: data.model,
          reason: data.reason,
          case_number: data.case_number,
          suburb: data.suburb,
          has_images: data.has_images,
          updated_at: new Date().toISOString()
        })
        .eq('id', alert.id)
        .eq('user_id', user.id) // Ensure user can only edit their own reports

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setSuccess('Report updated successfully!')
      
      // Callback to refresh alerts
      if (onAlertUpdated) {
        onAlertUpdated()
      }

      // Log the action
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'update_alert',
            ip_address: '',
            user_agent: navigator.userAgent
          }
        ])

    } catch (error: any) {
      console.error('Form submission error:', error)
      setError(error.message || 'Failed to update report. Please try again.')
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
    <div className="card p-6 mb-8 relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-accent-gold p-2 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-primary-black" />
          </div>
          <h2 className="text-2xl font-bold text-primary-white">Edit Report</h2>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
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

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating Report...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                <span>Update Report</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}