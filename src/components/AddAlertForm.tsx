'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
import { AlertTriangle, Upload, X, Image as ImageIcon } from 'lucide-react'

interface AlertForm {
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  suburb: string
}

interface ImageFile {
  file: File
  preview: string
}

export default function AddAlertForm({ onAlertAdded }: { onAlertAdded?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlertForm>()

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImageFiles: ImageFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files (JPEG, PNG, etc.)')
        continue
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        continue
      }
      
      const preview = URL.createObjectURL(file)
      newImageFiles.push({ file, preview })
    }
    
    setImageFiles(prev => [...prev, ...newImageFiles].slice(0, 10)) // Max 10 images
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadImages = async (alertId: string): Promise<string[]> => {
  if (imageFiles.length === 0) return []

  setUploadingImages(true)
  const imageUrls: string[] = []

  try {
    for (const imageFile of imageFiles) {
      const fileExt = imageFile.file.name.split('.').pop()
      const fileName = `${alertId}/${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(fileName, imageFile.file)

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        throw new Error(`Failed to upload image: ${uploadError.message}`)
      }

      // Use getPublicUrl to get the publicly accessible URL
      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(fileName)

      imageUrls.push(publicUrl)
    }
  } finally {
    setUploadingImages(false)
  }

  return imageUrls
}

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
      const { data: alertData, error: insertError } = await supabase
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
            has_images: imageFiles.length > 0
          }
        ])
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      // Upload images if any
      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(alertData.id)
        
        // Update alert with image URLs
        if (imageUrls.length > 0) {
          const { error: updateError } = await supabase
            .from('alerts_vehicles')
            .update({ image_urls: imageUrls })
            .eq('id', alertData.id)

          if (updateError) {
            console.error('Image URL update error:', updateError)
            // Continue anyway - the alert was created successfully
          }
        }
      }

      setSuccess(`Report filed successfully! ${imageUrls.length > 0 ? `${imageUrls.length} image(s) uploaded.` : ''}`)
      
      // Clean up
      imageFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setImageFiles([])
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

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Images (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center space-x-2 text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Select images (Max 10, 5MB each)</span>
            </label>
            <p className="text-sm text-gray-400 mt-2">
              Upload CCTV footage screenshots, photos of the vehicle, or other evidence
            </p>
          </div>

          {/* Image Previews */}
          {imageFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="w-4 h-4 text-accent-gold" />
                <span className="text-sm font-medium text-gray-300">
                  {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageFiles.map((imageFile, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageFile.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploadingImages || !hasValidSupabaseConfig}
          className="w-full btn-primary flex items-center justify-center space-x-2"
        >
          {loading || uploadingImages ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>
                {uploadingImages ? 'Uploading Images...' : 'Filing Report...'}
              </span>
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
          {imageFiles.length > 0 && (
            <p>🖼️ {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} will be attached to this report</p>
          )}
        </div>
      </form>
    </div>
  )
}