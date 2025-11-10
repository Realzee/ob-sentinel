// app/bolo-generator/page.tsx
'use client'

import BoloCardGenerator from '@/components/BoloCardGenerator'
import { FileText, Shield, Car } from 'lucide-react'

export default function BoloGeneratorPage() {
  return (
    <div className="min-h-screen bg-dark-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-white mb-2">
            BOLO Card Generator
          </h1>
          <p className="text-gray-400 text-lg">
            Create professional "Be On the Lookout" cards for stolen vehicles
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 text-center">
            <div className="bg-accent-gold p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Car className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-primary-white mb-2">Vehicle Details</h3>
            <p className="text-gray-400 text-sm">
              Input comprehensive vehicle information including plate, make, model, and color
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="bg-red-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-primary-white mb-2">Professional Layout</h3>
            <p className="text-gray-400 text-sm">
              Generate clean, professional BOLO cards optimized for printing and sharing
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="bg-blue-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-primary-white mb-2">Multiple Formats</h3>
            <p className="text-gray-400 text-sm">
              Print directly or download as HTML for digital distribution
            </p>
          </div>
        </div>

        {/* BOLO Generator Component */}
        <BoloCardGenerator />
      </div>
    </div>
  )
}