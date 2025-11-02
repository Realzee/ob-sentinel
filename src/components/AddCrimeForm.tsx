'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
import { AlertTriangle, Upload, X, Image as ImageIcon, Hash, MessageCircle, Building, Calendar, Clock, User, Shield, AlertCircle } from 'lucide-react'

interface CrimeFormData {
  crime_type: string
  description: string
  location: string
  suburb: string
  date_occurred: string
  time_occurred: string
  suspects_description: string
  weapons_involved: boolean
  injuries: boolean
  case_number: string
  station_reported_at: string
  comments: string
}

interface ImageFile {
  file: File
  preview: string
}

// Function to generate OB number
const generateOBNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `CR${year}${month}${day}-${hours}${minutes}${seconds}-${randomChars}`;
}

// Sorted South African suburbs
const saSuburbs = [
  'Bedfordview', 'Bryanston', 'Centurion', 'Edenvale', 'Fourways',
  'Greenside', 'Hyde Park', 'Illovo', 'Johannesburg CBD', 'Melville',
  'Midrand', 'Parkhurst', 'Pretoria', 'Randburg', 'Rosebank', 'Sandton', 'Other'
].sort();

// Crime types
const crimeTypes = [
  'Armed Robbery',
  'House Robbery',
  'Business Robbery',
  'Carjacking',
  'Theft',
  'Burglary',
  'Assault',
  'Domestic Violence',
  'Vandalism',
  'Drug Related',
  'Suspicious Activity',
  'Other'
].sort();

// Common SAPS Stations
const sapsStations = [
  'Sandton SAPS', 'Randburg SAPS', 'Rosebank SAPS', 'Douglasdale SAPS',
  'Midrand SAPS', 'Pretoria Central SAPS', 'Brooklyn SAPS', 'Lyttelton SAPS', 'Other'
].sort();

export default function AddCrimeForm({ onCrimeReportAdded }: { onCrimeReportAdded?: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([])
  const [obNumber, setObNumber] = useState<string>(generateOBNumber())
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CrimeFormData>()

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
    
    setImageFiles(prev => [...prev, ...newImageFiles].slice(0, 10))
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

  const uploadImages = async (reportId: string): Promise<string[]> => {
    if (imageFiles.length === 0) return []

    setUploadingImages(true)
    const imageUrls: string[] = []

    try {
      for (const imageFile of imageFiles) {
        const fileExt = imageFile.file.name.split('.').pop()
        const fileName = `${reportId}/${Math.random().toString(36).substring(2)}.${fileExt}`

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

        imageUrls.push(publicUrl)
      }
    } finally {
      setUploadingImages(false)
    }

    return imageUrls
  }

  const onSubmit = async (data: CrimeFormData) => {
    if (!hasValidSupabaseConfig) {
      setError('System not configured. Please check environment variables.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('You must be logged in to file crime reports')
        return
      }

      const dbUser = await ensureUserExists(user.id, {
        email: user.email!,
        name: user.user_metadata?.name
      })

      if (!dbUser) {
        setError('Unable to verify your account. Please try logging in again.')
        return
      }

      // Combine date and time
      const dateTimeOccurred = data.date_occurred && data.time_occurred 
        ? `${data.date_occurred}T${data.time_occurred}`
        : null

      // Insert crime report
      const { data: reportData, error: insertError } = await supabase
        .from('crime_reports')
        .insert([
          {
            user_id: user.id,
            crime_type: data.crime_type,
            description: data.description,
            location: data.location,
            suburb: data.suburb,
            date_occurred: dateTimeOccurred,
            time_occurred: data.time_occurred,
            suspects_description: data.suspects_description,
            weapons_involved: data.weapons_involved,
            injuries: data.injuries,
            case_number: data.case_number,
            station_reported_at: data.station_reported_at,
            ob_number: obNumber,
            comments: data.comments,
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
        imageUrls = await uploadImages(reportData.id)
        
        if (imageUrls.length > 0) {
          const { error: updateError } = await supabase
            .from('crime_reports')
            .update({ image_urls: imageUrls })
            .eq('id', reportData.id)

          if (updateError) {
            console.error('Image URL update error:', updateError)
          }
        }
      }

      setSuccess(`Crime report filed successfully! OB Number: ${obNumber} ${imageUrls.length > 0 ? `${imageUrls.length} image(s) uploaded.` : ''}`)
      
      // Clean up
      imageFiles.forEach(file => URL.revokeObjectURL(file.preview))
      setImageFiles([])
      reset()
      
      // Generate new OB number for next report
      setObNumber(generateOBNumber())
      
      // Mock notification
      console.log('📱 CRIME ALERT MOCK:')
      console.log(`New crime report: ${data.crime_type} in ${data.suburb} - OB: ${obNumber}`)
      
      if (onCrimeReportAdded) {
        onCrimeReportAdded()
      }

      // Log the action
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'create_crime_report',
            ip_address: '',
            user_agent: navigator.userAgent
          }
        ])

    } catch (error: any) {
      console.error('Form submission error:', error)
      setError(error.message || 'Failed to file crime report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-red-600 p-2 rounded-lg">
          <Shield className="w-6 h-6 text-primary-white" />
        </div>
        <h2 className="text-2xl font-bold text-primary-white">File Crime Report</h2>
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

      {/* OB Number Display */}
      <div className="bg-red-600 text-primary-white p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-3">
          <Hash className="w-6 h-6" />
          <div>
            <h3 className="font-bold text-lg">CR Number: {obNumber}</h3>
            <p className="text-sm opacity-90">This number will be assigned to your crime report</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Crime Type */}
        <div>
          <label htmlFor="crime_type" className="block text-sm font-medium text-gray-300 mb-2">
            Crime Type *
          </label>
          <select
            id="crime_type"
            {...register('crime_type', { required: 'Crime type is required' })}
            className="form-input"
          >
            <option value="">Select crime type</option>
            {crimeTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.crime_type && (
            <p className="text-red-400 text-sm mt-1">{errors.crime_type.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description of Incident *
          </label>
          <textarea
            id="description"
            {...register('description', { required: 'Description is required' })}
            rows={3}
            className="form-input resize-none"
            placeholder="Provide a detailed description of what happened..."
          />
          {errors.description && (
            <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
              Specific Location *
            </label>
            <input
              type="text"
              id="location"
              {...register('location', { required: 'Location is required' })}
              className="form-input"
              placeholder="e.g., 123 Main Street, Shopping Center, etc."
            />
            {errors.location && (
              <p className="text-red-400 text-sm mt-1">{errors.location.message}</p>
            )}
          </div>

          {/* Suburb */}
          <div>
            <label htmlFor="suburb" className="block text-sm font-medium text-gray-300 mb-2">
              Suburb *
            </label>
            <input
              type="text"
              id="suburb"
              {...register('suburb', { required: 'Suburb is required' })}
              className="form-input"
              placeholder="Enter suburb"
              list="suburb-suggestions"
            />
            <datalist id="suburb-suggestions">
              {saSuburbs.map(suburb => (
                <option key={suburb} value={suburb} />
              ))}
            </datalist>
            {errors.suburb && (
              <p className="text-red-400 text-sm mt-1">{errors.suburb.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Occurred */}
          <div>
            <label htmlFor="date_occurred" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date Occurred</span>
              </div>
            </label>
            <input
              type="date"
              id="date_occurred"
              {...register('date_occurred')}
              className="form-input"
            />
          </div>

          {/* Time Occurred */}
          <div>
            <label htmlFor="time_occurred" className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Time Occurred</span>
              </div>
            </label>
            <input
              type="time"
              id="time_occurred"
              {...register('time_occurred')}
              className="form-input"
            />
          </div>
        </div>

        {/* Suspects Description */}
        <div>
          <label htmlFor="suspects_description" className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Suspects Description</span>
            </div>
          </label>
          <textarea
            id="suspects_description"
            {...register('suspects_description')}
            rows={3}
            className="form-input resize-none"
            placeholder="Describe the suspects (appearance, clothing, age, gender, distinctive features, etc.)..."
          />
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              {...register('weapons_involved')}
              className="rounded border-gray-600 bg-dark-gray text-red-600 focus:ring-red-600"
            />
            <span className="text-sm text-gray-300">Weapons involved</span>
          </label>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              {...register('injuries')}
              className="rounded border-gray-600 bg-dark-gray text-red-600 focus:ring-red-600"
            />
            <span className="text-sm text-gray-300">Injuries sustained</span>
          </label>
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
                <Building className="w-4 h-4" />
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

        {/* Additional Comments */}
        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-300 mb-2">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Additional Comments</span>
            </div>
          </label>
          <textarea
            id="comments"
            {...register('comments')}
            rows={3}
            className="form-input resize-none"
            placeholder="Any additional information, witnesses, vehicle descriptions, etc."
          />
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upload Evidence (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="crime-image-upload"
            />
            <label
              htmlFor="crime-image-upload"
              className="cursor-pointer inline-flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Select evidence images (Max 10, 5MB each)</span>
            </label>
            <p className="text-sm text-gray-400 mt-2">
              Upload photos of the scene, suspects, damages, or other evidence
            </p>
          </div>

          {/* Image Previews */}
          {imageFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-gray-300">
                  {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageFiles.map((imageFile, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageFile.preview}
                      alt={`Evidence ${index + 1}`}
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
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading || uploadingImages ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>
                {uploadingImages ? 'Uploading Evidence...' : 'Filing Crime Report...'}
              </span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              <span>Submit Crime Report</span>
            </>
          )}
        </button>

        <div className="text-center text-sm text-gray-500">
          <p>⚠️ This crime report will be visible to all community members</p>
          <p>🚨 Emergency situations: Always call 10111 immediately</p>
          <p>🔢 CR Number: <strong>{obNumber}</strong> will be assigned to this report</p>
          {imageFiles.length > 0 && (
            <p>🖼️ {imageFiles.length} evidence image{imageFiles.length > 1 ? 's' : ''} will be attached</p>
          )}
        </div>
      </form>
    </div>
  )
}