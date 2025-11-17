// components/LazyImage.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon } from 'lucide-react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}

export default function LazyImage({ src, alt, className = '', onClick }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    const currentRef = imgRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [])

  const handleImageLoad = () => {
    setLoaded(true)
    setError(false)
  }

  const handleImageError = () => {
    setError(true)
    setLoaded(true)
  }

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700 animate-pulse">
          <ImageIcon className="w-6 h-6 text-gray-500" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="text-center text-gray-500">
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
      
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      )}
    </div>
  )
}