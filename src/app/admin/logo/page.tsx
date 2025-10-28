'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function LogoUpload() {
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage('')
      setError('')

      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type and size
      if (!file.type.includes('png') && !file.type.includes('svg')) {
        throw new Error('Only PNG and SVG files are allowed')
      }

      if (file.size > 100 * 1024) { // 100KB limit for free tier
        throw new Error('File size must be less than 100KB')
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload('logo.png', file, { upsert: true })

      if (uploadError) throw uploadError

      setMessage('Logo uploaded successfully!')
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-sa-blue mb-6">Upload Logo</h1>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">
          Upload your organization logo (PNG or SVG, max 100KB)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.svg"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="logo-upload"
        />
        
        <label
          htmlFor="logo-upload"
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white ${
            uploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-sa-blue hover:bg-blue-700 cursor-pointer'
          } transition-colors`}
        >
          {uploading ? 'Uploading...' : 'Choose File'}
        </label>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Upload Guidelines:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• PNG or SVG format only</li>
          <li>• Maximum file size: 100KB</li>
          <li>• Recommended dimensions: 128x128 pixels</li>
          <li>• Transparent background preferred</li>
        </ul>
      </div>
    </div>
  )
}