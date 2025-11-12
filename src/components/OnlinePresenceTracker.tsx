'use client'

import { useEffect, useState } from 'react'
import { supabase, getOnlineUsers, updateUserPresence, OnlineUser } from '@/lib/supabase'
import { Wifi, WifiOff, Users, Clock } from 'lucide-react'

interface OnlinePresenceTrackerProps {
  userId?: string
  showPanel?: boolean
}

export default function OnlinePresenceTracker({ userId, showPanel = false }: OnlinePresenceTrackerProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!userId) return

    // Update user presence on mount
    updateUserPresence(userId)
    setIsOnline(true)

    // Set up interval to update presence
    const presenceInterval = setInterval(() => {
      updateUserPresence(userId)
    }, 30000) // Update every 30 seconds

    // Set up interval to fetch online users
    const fetchInterval = setInterval(() => {
      fetchOnlineUsers()
    }, 60000) // Fetch every 60 seconds

    // Initial fetch
    fetchOnlineUsers()

    return () => {
      clearInterval(presenceInterval)
      clearInterval(fetchInterval)
    }
  }, [userId])

  const fetchOnlineUsers = async () => {
    try {
      const users = await getOnlineUsers()
      setOnlineUsers(users)
    } catch (error) {
      console.error('Error fetching online users:', error)
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / 60000)
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const currentlyOnline = onlineUsers.filter(user => {
    const lastSeen = new Date(user.last_seen)
    return (Date.now() - lastSeen.getTime()) < 2 * 60 * 1000 // 2 minutes
  })

  if (!showPanel) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-500" />
        )}
        <span>{currentlyOnline.length} online</span>
      </div>
    )
  }

  return (
    <div className="bg-dark-gray border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-accent-gold" />
          <h3 className="font-semibold text-primary-white">Online Users</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>{currentlyOnline.length} online</span>
        </div>
      </div>

      <div className="space-y-3">
        {currentlyOnline.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No users online</p>
          </div>
        ) : (
          currentlyOnline.map(user => (
            <div key={user.user_id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-3 h-3 bg-green-400 rounded-full absolute -top-1 -right-1 border-2 border-dark-gray"></div>
                  <div className="w-8 h-8 bg-accent-gold rounded-full flex items-center justify-center text-black text-sm font-bold">
                    {user.profiles?.name?.[0]?.toUpperCase() || user.profiles?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-white">
                    {user.profiles?.name || user.profiles?.email?.split('@')[0] || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">
                    {user.profiles?.role}
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-400 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>now</span>
              </div>
            </div>
          ))
        )}
      </div>

      {onlineUsers.filter(user => {
        const lastSeen = new Date(user.last_seen)
        return (Date.now() - lastSeen.getTime()) >= 2 * 60 * 1000
      }).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Recently Active</h4>
          <div className="space-y-2">
            {onlineUsers
              .filter(user => {
                const lastSeen = new Date(user.last_seen)
                return (Date.now() - lastSeen.getTime()) >= 2 * 60 * 1000
              })
              .slice(0, 5) // Show only 5 recently active users
              .map(user => (
                <div key={user.user_id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 truncate">
                    {user.profiles?.name || user.profiles?.email?.split('@')[0] || 'Unknown User'}
                  </span>
                  <span className="text-gray-500">
                    {getTimeAgo(user.last_seen)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}