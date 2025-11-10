// components/BoloCardGenerator.tsx
'use client'

import { useState, useRef } from 'react'
import { AlertVehicle } from '@/types'
import { Download, Printer, FileText, Car, MapPin, Calendar, Hash, Shield, X, Upload, Image as ImageIcon } from 'lucide-react'

interface BoloCardGeneratorProps {
  alert?: AlertVehicle
  onClose?: () => void
}

interface BoloFormData {
  number_plate: string
  make: string
  model: string
  color: string
  case_number: string
  station_reported_at: string
  suburb: string
  incident_date?: string
  comments?: string
  contact_number: string
  vehicle_image?: string
}

interface ImageFile {
  file: File
  preview: string
}

export default function BoloCardGenerator({ alert, onClose }: BoloCardGeneratorProps) {
  // Fixed: Completely remove the problematic initialization and use simple state
  const [showForm, setShowForm] = useState<boolean>(!alert)
  
  const [formData, setFormData] = useState<BoloFormData>({
    number_plate: alert?.number_plate || '',
    make: alert?.make || '',
    model: alert?.model || '',
    color: alert?.color || '',
    case_number: alert?.case_number || '',
    station_reported_at: alert?.station_reported_at || '',
    suburb: alert?.suburb || '',
    incident_date: alert?.incident_date || '',
    comments: alert?.comments || '',
    contact_number: '08469-10111',
    vehicle_image: alert?.image_urls?.[0] || ''
  })

  const [imageFile, setImageFile] = useState<ImageFile | null>(null)
  const boloRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: keyof BoloFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      window.alert('Please upload only image files (JPEG, PNG, etc.)')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Image size must be less than 5MB')
      return
    }

    const preview = URL.createObjectURL(file)
    setImageFile({ file, preview })
    setFormData(prev => ({ ...prev, vehicle_image: preview }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = () => {
    if (imageFile?.preview) {
      URL.revokeObjectURL(imageFile.preview)
    }
    setImageFile(null)
    setFormData(prev => ({ ...prev, vehicle_image: '' }))
  }

  const generateBolo = () => {
    setShowForm(false)
  }

  const printBolo = () => {
    const boloElement = boloRef.current
    if (!boloElement) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>BOLO Card - ${formData.number_plate}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              background: white;
            }
            .bolo-container {
              background: white;
              border: 2px solid #e74c3c;
              border-radius: 12px;
              overflow: hidden;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .bolo-header {
              background: #e74c3c;
              color: white;
              padding: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 22px;
            }
            .bolo-subheader {
              background: #c0392b;
              color: white;
              padding: 12px;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
            }
            .bolo-content {
              padding: 25px;
            }
            .bolo-image-section {
              text-align: center;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 2px dashed #dee2e6;
            }
            .bolo-image {
              max-width: 100%;
              max-height: 200px;
              object-fit: contain;
              border-radius: 6px;
              border: 2px solid #e74c3c;
            }
            .no-image {
              color: #6c757d;
              font-style: italic;
              padding: 20px;
            }
            .bolo-details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .bolo-detail {
              display: flex;
              flex-direction: column;
            }
            .detail-label {
              font-weight: bold;
              color: #2c3e50;
              font-size: 14px;
              margin-bottom: 4px;
            }
            .detail-value {
              color: #34495e;
              font-size: 16px;
              font-weight: 600;
            }
            .bolo-contact {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #e74c3c;
            }
            .contact-title {
              font-weight: bold;
              font-size: 16px;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .contact-info {
              font-size: 15px;
              line-height: 1.5;
            }
            .bolo-message {
              text-align: center;
              font-style: italic;
              color: #7f8c8d;
              margin: 20px 0;
              font-size: 16px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .bolo-footer {
              text-align: center;
              margin-top: 25px;
              padding-top: 20px;
              border-top: 2px solid #ecf0f1;
            }
            .footer-line {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
              font-size: 16px;
            }
            .footer-contact {
              color: #e74c3c;
              font-weight: 600;
              font-size: 15px;
            }
            @media print {
              body { margin: 0; padding: 0; background: white; }
              .bolo-container { border: 2px solid #e74c3c !important; box-shadow: none; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${boloElement.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const downloadBolo = () => {
    const boloElement = boloRef.current
    if (!boloElement) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BOLO Card - ${formData.number_plate}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #f5f5f5;
            }
            .bolo-container {
              background: white;
              border: 2px solid #e74c3c;
              border-radius: 12px;
              overflow: hidden;
              max-width: 500px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .bolo-header {
              background: #e74c3c;
              color: white;
              padding: 20px;
              text-align: center;
              font-weight: bold;
              font-size: 22px;
            }
            .bolo-subheader {
              background: #c0392b;
              color: white;
              padding: 12px;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
            }
            .bolo-content {
              padding: 25px;
            }
            .bolo-image-section {
              text-align: center;
              margin-bottom: 20px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 2px dashed #dee2e6;
            }
            .bolo-image {
              max-width: 100%;
              max-height: 200px;
              object-fit: contain;
              border-radius: 6px;
              border: 2px solid #e74c3c;
            }
            .no-image {
              color: #6c757d;
              font-style: italic;
              padding: 20px;
            }
            .bolo-details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .bolo-detail {
              display: flex;
              flex-direction: column;
            }
            .detail-label {
              font-weight: bold;
              color: #2c3e50;
              font-size: 14px;
              margin-bottom: 4px;
            }
            .detail-value {
              color: #34495e;
              font-size: 16px;
              font-weight: 600;
            }
            .bolo-contact {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #e74c3c;
            }
            .contact-title {
              font-weight: bold;
              font-size: 16px;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .contact-info {
              font-size: 15px;
              line-height: 1.5;
            }
            .bolo-message {
              text-align: center;
              font-style: italic;
              color: #7f8c8d;
              margin: 20px 0;
              font-size: 16px;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .bolo-footer {
              text-align: center;
              margin-top: 25px;
              padding-top: 20px;
              border-top: 2px solid #ecf0f1;
            }
            .footer-line {
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 5px;
              font-size: 16px;
            }
            .footer-contact {
              color: #e74c3c;
              font-weight: 600;
              font-size: 15px;
            }
          </style>
        </head>
        <body>
          ${boloElement.innerHTML}
        </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bolo-card-${formData.number_plate}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const BoloCard = () => (
    <div ref={boloRef} className="bolo-container">
      {/* Header */}
      <div className="bolo-header">
        Rapid911 Stolen & Hijacked Vehicles
      </div>
      
      {/* Subheader */}
      <div className="bolo-subheader">
        SOUGHT VEHICLE
      </div>

      {/* Content */}
      <div className="bolo-content">
        {/* Vehicle Image Section */}
        <div className="bolo-image-section">
          {formData.vehicle_image ? (
            <img 
              src={formData.vehicle_image} 
              alt={`${formData.make} ${formData.model} - ${formData.number_plate}`}
              className="bolo-image"
            />
          ) : (
            <div className="no-image">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No vehicle image available</p>
            </div>
          )}
        </div>

        {/* Vehicle Details Grid */}
        <div className="bolo-details-grid">
          <div className="bolo-detail">
            <span className="detail-label">Status:</span>
            <span className="detail-value">Stolen</span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Reg Number:</span>
            <span className="detail-value">{formData.number_plate}</span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Make:</span>
            <span className="detail-value">{formData.make}</span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Model:</span>
            <span className="detail-value">{formData.model}</span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Color:</span>
            <span className="detail-value">{formData.color}</span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Case No:</span>
            <span className="detail-value">
              {formData.case_number || 'N/A'}
            </span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Station:</span>
            <span className="detail-value">
              {formData.station_reported_at || 'N/A'}
            </span>
          </div>
          <div className="bolo-detail">
            <span className="detail-label">Area:</span>
            <span className="detail-value">{formData.suburb}</span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bolo-contact">
          <div className="contact-title">If spotted please contact:</div>
          <div className="contact-info">
            <div><strong>SAPS Crime Stop: 08600 10111</strong></div>
            <div>or your nearest SAPS Station</div>
            {formData.contact_number && (
              <div style={{ marginTop: '8px' }}>
                Community Contact: <strong>{formData.contact_number}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Additional Comments */}
        {formData.comments && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '8px', fontSize: '16px' }}>
              Additional Information:
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.4', color: '#34495e' }}>
              {formData.comments}
            </div>
          </div>
        )}

        {/* Message */}
        <div className="bolo-message">
          Community Safety Reporting System
        </div>

        {/* Footer */}
        <div className="bolo-footer">
          <div className="footer-line">Stolen & Hijacked Vehicles</div>
          <div className="footer-contact">
            {formData.contact_number || '08469-10111'}
          </div>
        </div>
      </div>
    </div>
  )

  const BoloForm = () => (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-accent-gold p-2 rounded-lg">
            <FileText className="w-6 h-6 text-black" />
          </div>
          <h2 className="text-2xl font-bold text-primary-white">Generate BOLO Card</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Vehicle Image Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Vehicle Image (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="vehicle-image-upload"
            />
            <label
              htmlFor="vehicle-image-upload"
              className="cursor-pointer inline-flex items-center space-x-2 text-accent-gold hover:text-accent-gold/80 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Select vehicle image</span>
            </label>
            <p className="text-sm text-gray-400 mt-2">
              Upload a clear photo of the vehicle (Max 5MB)
            </p>
          </div>

          {/* Image Preview */}
          {formData.vehicle_image && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <ImageIcon className="w-4 h-4 text-accent-gold" />
                <span className="text-sm font-medium text-gray-300">Image Preview</span>
              </div>
              <div className="relative inline-block">
                <img
                  src={formData.vehicle_image}
                  alt="Vehicle preview"
                  className="w-48 h-32 object-cover rounded border border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Number Plate *
          </label>
          <input
            type="text"
            value={formData.number_plate}
            onChange={(e) => handleInputChange('number_plate', e.target.value.toUpperCase())}
            className="form-input"
            placeholder="CA 123 AB"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Color *
          </label>
          <input
            type="text"
            value={formData.color}
            onChange={(e) => handleInputChange('color', e.target.value)}
            className="form-input"
            placeholder="Bottle Green"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Make *
          </label>
          <input
            type="text"
            value={formData.make}
            onChange={(e) => handleInputChange('make', e.target.value)}
            className="form-input"
            placeholder="Nissan"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Model *
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
            className="form-input"
            placeholder="Sentra"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Case Number
          </label>
          <input
            type="text"
            value={formData.case_number}
            onChange={(e) => handleInputChange('case_number', e.target.value)}
            className="form-input"
            placeholder="CAS 123/09/2023"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            SAPS Station
          </label>
          <input
            type="text"
            value={formData.station_reported_at}
            onChange={(e) => handleInputChange('station_reported_at', e.target.value)}
            className="form-input"
            placeholder="Mitchell's Plain SAPS"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Suburb / Area *
          </label>
          <input
            type="text"
            value={formData.suburb}
            onChange={(e) => handleInputChange('suburb', e.target.value)}
            className="form-input"
            placeholder="Mitchell's Plain"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Incident Date
          </label>
          <input
            type="date"
            value={formData.incident_date}
            onChange={(e) => handleInputChange('incident_date', e.target.value)}
            className="form-input"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Additional Information
          </label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
            className="form-input resize-none"
            rows={3}
            placeholder="Any additional details about the vehicle, suspects, or incident..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contact Number
          </label>
          <input
            type="text"
            value={formData.contact_number}
            onChange={(e) => handleInputChange('contact_number', e.target.value)}
            className="form-input"
            placeholder="08469-10111"
          />
        </div>
      </div>

      <button
        onClick={generateBolo}
        disabled={!formData.number_plate || !formData.make || !formData.model || !formData.color || !formData.suburb}
        className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="w-5 h-5" />
        <span>Generate BOLO Card</span>
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {showForm ? (
        <BoloForm />
      ) : (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-accent-gold p-2 rounded-lg">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-primary-white">BOLO Card Preview</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowForm(true)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Edit"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BOLO Card Preview */}
          <div className="flex justify-center mb-6 p-4 bg-gray-800 rounded-lg">
            <BoloCard />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={printBolo}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print BOLO Card</span>
            </button>
            
            <button
              onClick={downloadBolo}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download HTML</span>
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="border border-gray-600 text-gray-300 hover:bg-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
            >
              Edit Details
            </button>
          </div>

          <div className="text-center text-sm text-gray-400 mt-4">
            <p>💡 Tip: Use the print button for best results, or download as HTML to share digitally.</p>
            <p>🖼️ Vehicle image will be included in the BOLO card for better identification.</p>
            <p>🖨️ The BOLO card is optimized for printing and will look great when printed.</p>
          </div>
        </div>
      )}
    </div>
  )
}