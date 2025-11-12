'use client'

import { useEffect } from 'react'
import { supabase, updateOnlineStatus } from '@/lib/supabase'

export default function OnlinePresenceTracker() {
  useEffect(() => {
    const updateStatus = async () => {
      await updateOnlineStatus()
    }

    // Update on mount
    updateStatus()

    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000)

    // Update on visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Update on page show (when navigating back to the page)
    const handlePageShow = () => {
      updateStatus()
    }

    window.addEventListener('pageshow', handlePageShow)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  return null // This component doesn't render anything
}