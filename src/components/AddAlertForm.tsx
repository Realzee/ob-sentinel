'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig, ensureUserExists, getSafeUserProfile } from '@/lib/supabase'
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
  const [obNumber, setObNumber] = useState<string>(generateOBNumber()) // Generate OB number on component mount
  const [location, setLocation] = useState<{latitude?: number, longitude?: number, address?: string}>({})
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<AlertForm>()

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

      // Ensure user exists in database
      const userExists = await ensureUserExists(user.id)

      if (!userExists) {
        setError('Unable to verify your account. Please try logging in again.')
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
        comments: data.comments || null,
        incident_date: data.incident_date || null
      }

      // Insert new alert with OB number and location
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
            ob_number: obNumber, // Include the generated OB number
            suburb: formData.suburb,
            comments: formData.comments,
            has_images: imageFiles.length > 0,
            latitude: formData.latitude,
            longitude: formData.longitude,
            incident_date: formData.incident_date,
            status: 'ACTIVE' // Default status for new reports
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

      setSuccess(`Report filed successfully! OB Number: ${obNumber} ${imageUrls.length > 0 ? `${imageUrls.length} image(s) uploaded.` : ''} ${data.latitude && data.longitude ? 'Location pin dropped.' : ''}`)
      
      // Enhanced logging with details
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'create_alert',
            ip_address: '',
            user_agent: navigator.userAgent,
            details: {
              alert_id: alertData.id,
              number_plate: formData.number_plate,
              reason: formData.reason,
              suburb: formData.suburb,
              ob_number: obNumber,
              has_images: imageFiles.length > 0,
              image_count: imageFiles.length,
              has_location: !!(data.latitude && data.longitude),
              vehicle_make: formData.make,
              vehicle_model: formData.model,
              vehicle_color: formData.color,
              user_role: profile.role,
              user_name: profile.name
            }
          }
        ])

      // Clean up
      imageFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setImageFiles([])
      setLocation({})
      reset()
      
      // Generate new OB number for next report
      setObNumber(generateOBNumber())
      
      // Mock WhatsApp notification
      console.log('📱 RAPID ALERT MOCK:')
      console.log(`New report: ${data.number_plate} - ${data.reason} in ${data.suburb} - OB: ${obNumber}`)
      
      // Callback to refresh alerts
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
          <div className="relative">
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
    className={`form-input ${errors.number_plate ? 'border-red-500' : ''}`}
    placeholder="CA 123 AB"
    style={{ textTransform: 'uppercase' }}
  />
  {errors.number_plate && (
    <div className="absolute -bottom-5 left-0">
      <p className="text-red-400 text-xs flex items-center space-x-1">
        <AlertTriangle className="w-3 h-3" />
        <span>{errors.number_plate.message}</span>
      </p>
    </div>
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

        {/* Incident Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="incident_date" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-accent-gold" />
                <span>Incident Date (Optional)</span>
              </div>
            </label>
            <input
              type="date"
              id="incident_date"
              {...register('incident_date')}
              className="form-input"
            />
            <p className="text-sm text-gray-400 mt-1">
              When did the incident occur? (Leave blank for today's date)
            </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SAPS Case Number */}
          <div>
            <label htmlFor="case_number" className="block text-sm font-medium text-gray-300 mb-2">
              SAPS Case Number (Optional)
            </label>
            <input
              type="text"
              id="case_number"
              {...register('case_number')}
              className="form-input"
              placeholder="CAS 123/09/2023"
            />
            <p className="text-sm text-gray-400 mt-1">
              If you have an official SAPS case number
            </p>
          </div>

          {/* Station Reported At */}
          <div>
            <label htmlFor="station_reported_at" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-accent-blue" />
                <span>Station Reported At (Optional)</span>
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
            <p className="text-sm text-gray-400 mt-1">
              Which SAPS station was this reported at?
            </p>
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
          <p>🔢 OB Number: <strong>{obNumber}</strong> will be assigned to this report</p>
          <p>🟢 Status: <strong>ACTIVE</strong> (You can update to RECOVERED later)</p>
          {location.latitude && location.longitude && (
            <p>📍 Location pin will be added to this report</p>
          )}
          {imageFiles.length > 0 && (
            <p>🖼️ {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} will be attached to this report</p>
          )}
        </div>
      </form>
    </div>
  )
}