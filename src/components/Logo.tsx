'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Logo() {
  const [logoUrl, setLogoUrl] = useState<string>('../rapid-ireport-logo.png')
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
        console.log('Using default RAPID iREPORT logo')
      } finally {
        setLoading(false)
      }
    }

    checkCustomLogo()
  }, [])

  if (loading) {
    return (
      <div className="w-12 h-12 bg-medium-gray rounded-lg flex items-center justify-center">
        <div className="w-8 h-8 bg-accent-gold rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="w-12 h-12 bg-accent-gold rounded-lg flex items-center justify-center">
      <img 
        src={logoUrl} 
        alt="RAPID iREPORT Logo"
        className="w-10 h-10 object-contain"
        onError={() => setLogoUrl('../rapid-ireport-logo.png')}
      />
    </div>
  )
}