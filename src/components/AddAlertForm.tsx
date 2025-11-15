'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig, getSafeUserProfile } from '@/lib/supabase'
import { AlertTriangle, Upload, X, Image as ImageIcon, Hash, MessageCircle, Building, MapPin, Navigation, Compass, Calendar } from 'lucide-react'

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
  incident_date?: string
  latitude?: number | null
  longitude?: number | null
}

interface ImageFile {
  file: File
  preview: string
}

// Function to generate OB number
const generateOBNumber = (): string => {
  const now = new Date();
  
  // Format: YYMMDD-HHMMSS-RANDOM
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  // Generate random 4-character string
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `OB${year}${month}${day}-${hours}${minutes}${seconds}-${randomChars}`;
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

export default function AddAlertForm({ onAlertAdded }: { onAlertAdded?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const [obNumber, setObNumber] = useState<string>(generateOBNumber())
  const [location, setLocation] = useState<{latitude?: number, longitude?: number, address?: string}>({})
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<AlertForm>()

  // OPTIMIZED: Get current location with better error handling
  const getCurrentLocation = useCallback(() => {
    setGettingLocation(true)
    setError('')
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setGettingLocation(false)
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        setValue('latitude', latitude)
        setValue('longitude', longitude)
        setGettingLocation(false)
        
        // OPTIMIZED: Reverse geocode in background
        setTimeout(() => {
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
        }, 0)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError('Unable to retrieve your location. Please enable location services or enter coordinates manually.')
        setGettingLocation(false)
      },
      options
    )
  }, [setValue])

  // Manual coordinate input
  const handleManualCoordinates = useCallback(() => {
    const lat = parseFloat(prompt('Enter latitude (e.g., -26.107566):') || '')
    const lon = parseFloat(prompt('Enter longitude (e.g., 28.056702):') || '')
    
    if (!isNaN(lat) && !isNaN(lon)) {
      setLocation({ latitude: lat, longitude: lon })
      setValue('latitude', lat)
      setValue('longitude', lon)
    } else if (lat !== 0 || lon !== 0) {
      setError('Invalid coordinates entered')
    }
  }, [setValue])

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

  const removeImage = useCallback((index: number) => {
    setImageFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }, [])

  // OPTIMIZED: Image upload with better error handling
  const uploadImages = async (alertId: string): Promise<string[]> => {
    if (imageFiles.length === 0) return []

    setUploadingImages(true)
    const imageUrls: string[] = []

    try {
      // Upload in parallel with Promise.all for better performance
      const uploadPromises = imageFiles.map(async (imageFile) => {
        const fileExt = imageFile.file.name.split('.').pop() || 'jpg'
        const fileName = `${alertId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(fileName, imageFile.file)

        if (uploadError) {
          console.error('Image upload error:', uploadError)
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('report-images')
          .getPublicUrl(fileName)

        return publicUrl
      })

      // Wait for all uploads to complete
      imageUrls.push(...(await Promise.all(uploadPromises)))
      
    } catch (error) {
      console.error('Error uploading images:', error)
      throw error
    } finally {
      setUploadingImages(false)
    }

    return imageUrls
  }

  // OPTIMIZED: Form submission with better validation
  const onSubmit = async (data: AlertForm) => {
    if (!hasValidSupabaseConfig) {
      setError('System not configured. Please check environment variables.')
      return
    }

    // Client-side validation
    if (!data.number_plate || !data.make || !data.model || !data.color || !data.suburb) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to file reports')
        return
      }

      // Check if user is approved
      const profile = await getSafeUserProfile(user.id);
      if (!profile) {
        setError('Unable to verify your account. Please try logging in again.')
        setLoading(false)
        return
      }

      if (!profile.approved) {
        setError('Your account is not approved yet. Please contact an administrator to get approved before filing reports.')
        setLoading(false)
        return
      }

      // Process form data
      const formData = {
        ...data,
        latitude: data.latitude && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null,
        longitude: data.longitude && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null,
        number_plate: data.number_plate.toUpperCase().replace(/\s/g, ''),
        case_number: data.case_number || null,
        station_reported_at: data.station_reported_at || null,
        comments: data.comments || null,
        incident_date: data.incident_date || null
      }

      // Insert new alert
      const { data: alertData, error: insertError } = await supabase
        .from('alerts_vehicles')
        .insert([
          {
            user_id: user.id,
            number_plate: formData.number_plate,
            color: formData.color,
            make: formData.make,
            model: formData.model,
            reason: formData.reason,
            case_number: formData.case_number,
            station_reported_at: formData.station_reported_at,
            ob_number: obNumber,
            suburb: formData.suburb,
            comments: formData.comments,
            has_images: imageFiles.length > 0,
            latitude: formData.latitude,
            longitude: formData.longitude,
            incident_date: formData.incident_date,
            status: 'ACTIVE'
          }
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // Upload images if any
      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        imageUrls = await uploadImages(alertData.id)
        
        if (imageUrls.length > 0) {
          await supabase
            .from('alerts_vehicles')
            .update({ image_urls: imageUrls })
            .eq('id', alertData.id)
        }
      }

      setSuccess(`Report filed successfully! OB Number: ${obNumber}`)
      
      // Clean up and reset
      imageFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setImageFiles([])
      setLocation({})
      reset()
      setObNumber(generateOBNumber())
      
      if (onAlertAdded) {
        onAlertAdded()
      }

    } catch (error: any) {
      console.error('Form submission error:', error)
      setError(error.message || 'Failed to file report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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

      {/* OB Number Display */}
      <div className="bg-accent-gold text-primary-black p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-3">
          <Hash className="w-6 h-6" />
          <div>
            <h3 className="font-bold text-lg">OB Number: {obNumber}</h3>
            <p className="text-sm opacity-90">This number will be assigned to your report</p>
          </div>
        </div>
      </div>

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

        {/* Location Section */}
        <div className="bg-dark-gray border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="w-5 h-5 text-accent-gold" />
            <h3 className="text-lg font-semibold text-primary-white">Location Pin Drop (Optional)</h3>
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
            </div>

            {location.latitude && location.longitude && (
              <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-4 h-4 text-accent-gold" />
                  <span className="text-sm font-medium text-accent-gold">Location Set</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    <strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                  {location.address && (
                    <p className="text-sm text-gray-300">
                      <strong>Address:</strong> {location.address}
                    </p>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`, '_blank')}
                      className="text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      View on OpenStreetMap
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocation({})
                        setValue('latitude', null)
                        setValue('longitude', null)
                      }}
                      className="text-sm text-red-400 hover:text-red-300 underline"
                    >
                      Remove Location
                    </button>
                  </div>
                </div>
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

            <p className="text-sm text-gray-400">
              📍 Adding a location pin helps community members quickly identify the incident area and provides better context for the report.
            </p>
          </div>
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
      </form>
    </div>
  )
}