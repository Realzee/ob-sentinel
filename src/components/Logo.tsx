'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Logo() {
  const [logoUrl, setLogoUrl] = useState<string>('/default-logo.svg')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkCustomLogo = async () => {
      try {
        // Check if custom logo exists in storage
        const { data: logoList } = await supabase
          .storage
          .from('logos')
          .list()

        const hasCustomLogo = logoList?.some(file => file.name === 'logo.png')
        
        if (hasCustomLogo) {
          const { data } = await supabase
            .storage
            .from('logos')
            .getPublicUrl('logo.png')
          
          if (data?.publicUrl) {
            setLogoUrl(data.publicUrl)
          }
        }
      } catch (error) {
        console.log('Using default logo')
      } finally {
        setLoading(false)
      }
    }

    checkCustomLogo()
  }, [])

  if (loading) {
    return (
      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
      <img 
        src={logoUrl} 
        alt="Organization Logo"
        className="w-10 h-10 object-contain"
        onError={() => setLogoUrl('/default-logo.svg')}
      />
    </div>
  )
}