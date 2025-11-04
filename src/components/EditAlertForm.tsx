'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, X, Upload, Image as ImageIcon, MessageCircle, Building, MapPin, Navigation, Compass } from 'lucide-react'

interface AlertForm {
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  station_reported_at: string
  suburb: string
  comments: string
  latitude?: number | null
  longitude?: number | null
}

interface ImageFile {
  file: File
  preview: string
}

interface EditAlertFormProps {
  alert: any
  onAlertUpdated: () => void
  onCancel: () => void
}

// Sorted South African suburbs
const saSuburbs = [
  'Bedfordview',
  'Bryanston', 
  'Centurion',
  'Edenvale',
  'Fourways',
  'Greenside',
  'Hyde Park',
  'Illovo',
  'Johannesburg CBD',
  'Melville',
  'Midrand',
  'Parkhurst',
  'Pretoria',
  'Randburg',
  'Rosebank',
  'Sandton',
  'Other'
].sort();

// Common South African vehicle makes
const saVehicleMakes = [
  'Toyota', 'Volkswagen', 'Ford', 'Nissan', 'BMW', 'Mercedes-Benz',
  'Hyundai', 'Kia', 'Isuzu', 'Mazda', 'Honda', 'Audi', 'Suzuki',
  'Renault', 'Chevrolet', 'Mitsubishi', 'Volvo', 'Land Rover', 'Other'
].sort();

// Common SAPS Stations
const sapsStations = [
  'Sandton SAPS',
  'Randburg SAPS',
  'Rosebank SAPS',
  'Douglasdale SAPS',
  'Midrand SAPS',
  'Pretoria Central SAPS',
  'Brooklyn SAPS',
  'Lyttelton SAPS',
  'Other'
].sort();

export default function EditAlertForm({ alert, onAlertUpdated, onCancel }: EditAlertFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(alert.image_urls || [])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [location, setLocation] = useState<{latitude?: number, longitude?: number, address?: string}>({
    latitude: alert.latitude,
    longitude: alert.longitude
  })
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<AlertForm>({
    defaultValues: {
      number_plate: alert.number_plate,
      color: alert.color,
      make: alert.make,
      model: alert.model,
      reason: alert.reason,
      case_number: alert.case_number || '',
      station_reported_at: alert.station_reported_at || '',
      suburb: alert.suburb,
      comments: alert.comments || '',
      latitude: alert.latitude,
      longitude: alert.longitude
    }
  })

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        setValue('latitude', latitude)
        setValue('longitude', longitude)
        setGettingLocation(false)
        
        // Reverse geocode to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(response => response.json())
          .then(data => {
            if (data.display_name) {
              setLocation(prev => ({ ...prev, address: data.display_name }))
            }
          })
          .catch(() => {
            // Silent fail - address is optional
          })
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError('Unable to retrieve your location. Please enable location services or enter coordinates manually.')
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // Manual coordinate input
  const handleManualCoordinates = () => {
    const lat = parseFloat(prompt('Enter latitude (e.g., -26.107566):') || '')
    const lon = parseFloat(prompt('Enter longitude (e.g., 28.056702):') || '')
    
    if (!isNaN(lat) && !isNaN(lon)) {
      setLocation({ latitude: lat, longitude: lon })
      setValue('latitude', lat)
      setValue('longitude', lon)
    } else if (lat !== 0 || lon !== 0) {
      setError('Invalid coordinates entered')
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newImageFiles: ImageFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files (JPEG, PNG, etc.)')
        continue
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        continue
      }
      
      const preview = URL.createObjectURL(file)
      newImageFiles.push({ file, preview })
    }
    
    setImageFiles(prev => [...prev, ...newImageFiles].slice(0, 10 - existingImages.length))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeNewImage = (index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const removeExistingImage = (index: number) => {
    const imageToDelete = existingImages[index]
    setExistingImages(prev => prev.filter((_, i) => i !== index))
    setImagesToDelete(prev => [...prev, imageToDelete])
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

      // ✅ FIX: Convert empty strings to null for numeric fields
      const formData = {
        ...data,
        latitude: data.latitude && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null,
        longitude: data.longitude && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null,
        number_plate: data.number_plate.toUpperCase().replace(/\s/g, ''),
        case_number: data.case_number || null,
        station_reported_at: data.station_reported_at || null,
        comments: data.comments || null
      }

      // Upload new images
      const newImageUrls = await uploadImages(alert.id)
      
      // Combine existing (non-deleted) images with new images
      const finalImageUrls = [
        ...existingImages.filter(url => !imagesToDelete.includes(url)),
        ...newImageUrls
      ]

      // Update alert with location
      const { error: updateError } = await supabase
        .from('alerts_vehicles')
        .update({
          number_plate: formData.number_plate,
          color: formData.color,
          make: formData.make,
          model: formData.model,
          reason: formData.reason,
          case_number: formData.case_number,
          station_reported_at: formData.station_reported_at,
          suburb: formData.suburb,
          comments: formData.comments,
          has_images: finalImageUrls.length > 0,
          image_urls: finalImageUrls,
          latitude: formData.latitude,
          longitude: formData.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', alert.id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      setSuccess(`Report updated successfully! ${newImageUrls.length > 0 ? `${newImageUrls.length} new image(s) uploaded.` : ''} ${data.latitude && data.longitude ? 'Location updated.' : ''}`)
      
      // Clean up
      imageFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setImageFiles([])
      
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
            <input
              type="text"
              id="make"
              {...register('make', { required: 'Make is required' })}
              className="form-input"
              placeholder="Toyota, Volkswagen, BMW, etc."
              list="make-suggestions"
            />
            <datalist id="make-suggestions">
              {saVehicleMakes.map(make => (
                <option key={make} value={make} />
              ))}
            </datalist>
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

        {/* Location Section */}
        <div className="bg-dark-gray border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-5 h-5 text-accent-gold" />
            <h3 className="text-lg font-semibold text-primary-white">Update Location Pin (Optional)</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {gettingLocation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>{gettingLocation ? 'Getting Location...' : 'Use Current Location'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleManualCoordinates}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Compass className="w-4 h-4" />
                <span>Enter Coordinates</span>
              </button>

              {(alert.latitude && alert.longitude) || (location.latitude && location.longitude) ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocation({})
                    setValue('latitude', null)
                    setValue('longitude', null)
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Remove Location</span>
                </button>
              ) : null}
            </div>

            {(location.latitude && location.longitude) || (alert.latitude && alert.longitude) ? (
              <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-accent-gold" />
                  <span className="text-sm font-medium text-accent-gold">
                    {location.latitude ? 'Updated Location Set' : 'Current Location'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    <strong>Coordinates:</strong> {(location.latitude || alert.latitude).toFixed(6)}, {(location.longitude || alert.longitude).toFixed(6)}
                  </p>
                  {location.address && (
                    <p className="text-sm text-gray-300">
                      <strong>Address:</strong> {location.address}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${location.latitude || alert.latitude}&mlon=${location.longitude || alert.longitude}#map=16/${location.latitude || alert.latitude}/${location.longitude || alert.longitude}`, '_blank')}
                    className="text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    View on OpenStreetMap
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-gray-600">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">No Location Set</span>
                </div>
                <p className="text-sm text-gray-400">
                  Add a location pin to help community members identify the incident area.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="hidden"
                {...register('latitude')}
              />
              <input
                type="hidden"
                {...register('longitude')}
              />
            </div>
          </div>
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

          {/* Station Reported At */}
          <div>
            <label htmlFor="station_reported_at" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-accent-blue" />
                <span>Station Reported At</span>
              </div>
            </label>
            <input
              type="text"
              id="station_reported_at"
              {...register('station_reported_at')}
              className="form-input"
              placeholder="Sandton SAPS, Randburg SAPS, etc."
              list="station-suggestions"
            />
            <datalist id="station-suggestions">
              {sapsStations.map(station => (
                <option key={station} value={station} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Suburb */}
          <div>
            <label htmlFor="suburb" className="block text-sm font-medium text-gray-300 mb-2">
              Suburb / Area *
            </label>
            <input
              type="text"
              id="suburb"
              {...register('suburb', { required: 'Suburb is required' })}
              className="form-input"
              placeholder="Enter suburb or area"
              list="suburb-suggestions"
            />
            <datalist id="suburb-suggestions">
              {saSuburbs.map(suburb => (
                <option key={suburb} value={suburb} />
              ))}
            </datalist>
            {errors.suburb && (
              <p className="text-accent-red text-sm mt-1">{errors.suburb.message}</p>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-accent-gold" />
              <span>Additional Comments & Details</span>
            </div>
          </label>
          <textarea
            id="comments"
            {...register('comments')}
            rows={4}
            className="form-input resize-none"
            placeholder="Provide additional details about the incident, such as:
• Time of incident
• Direction of travel
• Number of suspects
• Weapons observed
• Distinctive vehicle features
• Any other relevant information..."
          />
          <p className="text-sm text-gray-400 mt-1">
            Include any additional information that could help identify the vehicle or situation
          </p>
        </div>

        {/* Image Management Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Manage Images
          </label>
          
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="w-4 h-4 text-accent-gold" />
                <span className="text-sm font-medium text-gray-300">
                  Current Images ({existingImages.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-24 object-cover rounded border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
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

          {/* Add New Images */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload-edit"
            />
            <label
              htmlFor="image-upload-edit"
              className="cursor-pointer inline-flex items-center space-x-2 text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Add new images (Max {10 - existingImages.length} more)</span>
            </label>
            <p className="text-sm text-gray-400 mt-2">
              Upload additional evidence images
            </p>
          </div>

          {/* New Image Previews */}
          {imageFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="w-4 h-4 text-accent-gold" />
                <span className="text-sm font-medium text-gray-300">
                  {imageFiles.length} new image{imageFiles.length > 1 ? 's' : ''} to add
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageFiles.map((imageFile, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageFile.preview}
                      alt={`New preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded border border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                      New
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading || uploadingImages}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading || uploadingImages ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>
                  {uploadingImages ? 'Uploading Images...' : 'Updating Report...'}
                </span>
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