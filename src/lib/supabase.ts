import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Check if required environment variables are present
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasValidSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

if (!hasValidSupabaseConfig) {
  console.warn('Supabase configuration is missing. Please check your environment variables.')
}

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      }
    }
  }
)

// Types for our new features
export interface UserProfile {
  id: string
  email: string
  name: string | null
  approved: boolean
  role: 'user' | 'moderator' | 'admin'
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UserLog {
  id: string
  user_id: string
  action: string
  ip_address: string
  user_agent: string
  details: any
  created_at: string
}

export interface OnlineUser {
  id: string
  user_id: string
  last_seen: string
  online: boolean
  profiles: UserProfile
}

/**
 * Ensure a user exists in the profiles table, create if not exists
 */
export const ensureUserExists = async (userId: string, userData: { email: string; name?: string }): Promise<UserProfile | null> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - ensureUserExists skipped')
    return null
  }

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing profile:', fetchError)
      throw fetchError
    }

    if (existingProfile) {
      // Update last login and return existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating last login:', updateError)
      }
      
      return existingProfile
    }

    // Create new profile
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name || userData.email.split('@')[0],
          approved: false, // Default to not approved
          role: 'user',
          last_login: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user profile:', insertError)
      throw insertError
    }

    // Log the user creation
    await logUserAction(userId, 'user_created', {
      email: userData.email,
      name: userData.name
    })

    return newProfile
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return null
  }
}

/**
 * Log user actions for audit trail
 */
export const logUserAction = async (
  userId: string, 
  action: string, 
  details?: any,
  ipAddress?: string
): Promise<void> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - logUserAction skipped')
    return
  }

  try {
    // Try to get IP address if not provided
    let finalIpAddress = ipAddress
    if (!finalIpAddress && typeof window !== 'undefined') {
      try {
        // This is a client-side only approach - for production, you'd want server-side IP detection
        const response = await fetch('https://api.ipify.org?format=json')
        const data = await response.json()
        finalIpAddress = data.ip
      } catch (ipError) {
        console.warn('Could not fetch IP address:', ipError)
        finalIpAddress = 'unknown'
      }
    }

    const { error } = await supabase
      .from('user_logs')
      .insert([
        {
          user_id: userId,
          action,
          ip_address: finalIpAddress || '',
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : '',
          details
        }
      ])

    if (error) {
      console.error('Error logging action:', error)
    }
  } catch (error) {
    console.error('Error in logUserAction:', error)
  }
}

/**
 * Update user presence (online status)
 */
export const updateUserPresence = async (userId: string): Promise<void> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - updateUserPresence skipped')
    return
  }

  try {
    const { error } = await supabase
      .from('presence')
      .upsert([
        {
          user_id: userId,
          last_seen: new Date().toISOString(),
          online: true
        }
      ], {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error updating presence:', error)
    }
  } catch (error) {
    console.error('Error in updateUserPresence:', error)
  }
}

/**
 * Get currently online users (active in last 5 minutes)
 */
export const getOnlineUsers = async (): Promise<OnlineUser[]> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - getOnlineUsers skipped')
    return []
  }

  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('presence')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          role,
          approved,
          last_login,
          created_at
        )
      `)
      .gte('last_seen', fiveMinutesAgo)
      .order('last_seen', { ascending: false })

    if (error) {
      console.error('Error getting online users:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getOnlineUsers:', error)
    return []
  }
}

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - getUserProfile skipped')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error getting user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

/**
 * Check if user is approved to perform actions
 */
export const isUserApproved = async (userId: string): Promise<boolean> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - isUserApproved skipped')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking user approval:', error)
      return false
    }

    return data?.approved || false
  } catch (error) {
    console.error('Error in isUserApproved:', error)
    return false
  }
}

/**
 * Check if user has admin privileges
 */
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - isUserAdmin skipped')
    return false
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking admin status:', error)
      return false
    }

    return (data?.role === 'admin' || data?.role === 'moderator') && data?.approved
  } catch (error) {
    console.error('Error in isUserAdmin:', error)
    return false
  }
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - getAllUsers skipped')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting all users:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return []
  }
}

/**
 * Update user profile (admin only)
 */
export const updateUserProfile = async (
  userId: string, 
  updates: { approved?: boolean; role?: 'user' | 'moderator' | 'admin'; name?: string }
): Promise<UserProfile | null> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - updateUserProfile skipped')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return null
  }
}

/**
 * Get user logs with pagination
 */
export const getUserLogs = async (
  userId?: string, 
  limit: number = 1000, 
  offset: number = 0
): Promise<UserLog[]> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - getUserLogs skipped')
    return []
  }

  try {
    let query = supabase
      .from('user_logs')
      .select(`
        *,
        profiles (
          name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    // If userId is provided, filter by user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting user logs:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserLogs:', error)
    return []
  }
}

/**
 * Clean up old presence records (keep only last 24 hours)
 */
export const cleanupOldPresence = async (): Promise<void> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - cleanupOldPresence skipped')
    return
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { error } = await supabase
      .from('presence')
      .delete()
      .lt('last_seen', twentyFourHoursAgo)

    if (error) {
      console.error('Error cleaning up old presence:', error)
    }
  } catch (error) {
    console.error('Error in cleanupOldPresence:', error)
  }
}

/**
 * Initialize user session - call this after login
 */
export const initializeUserSession = async (userId: string): Promise<void> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - initializeUserSession skipped')
    return
  }

  try {
    // Update presence
    await updateUserPresence(userId)
    
    // Log login action
    await logUserAction(userId, 'user_login', {
      timestamp: new Date().toISOString()
    })

    // Clean up old presence records occasionally (1% chance)
    if (Math.random() < 0.01) {
      await cleanupOldPresence()
    }
  } catch (error) {
    console.error('Error initializing user session:', error)
  }
}

/**
 * Subscribe to real-time presence updates
 */
export const subscribeToPresence = (
  callback: (payload: any) => void
) => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - subscribeToPresence skipped')
    return () => {}
  }

  const subscription = supabase
    .channel('presence-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'presence'
      },
      callback
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}

// Add this function to check and fix user profiles
export const ensureUserProfile = async (userId: string, userData: { email: string; name?: string }) => {
  try {
    // First, check if profile exists without triggering recursion
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      return null;
    }

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            approved: false,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      return newProfile;
    }

    return existingProfile;
  } catch (error) {
    console.error('Error in ensureUserProfile:', error);
    return null;
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<{
  totalUsers: number
  approvedUsers: number
  onlineUsers: number
  adminUsers: number
}> => {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - getUserStats skipped')
    return {
      totalUsers: 0,
      approvedUsers: 0,
      onlineUsers: 0,
      adminUsers: 0
    }
  }

  try {
    // Get total and approved users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('approved, role')

    if (profilesError) throw profilesError

    // Get online users
    const onlineUsers = await getOnlineUsers()

    // Use type-safe filtering
    const approvedUsersCount = profiles ? profiles.filter((profile: { approved: any }) => profile.approved).length : 0;
    const adminUsersCount = profiles ? profiles.filter((profile: { role: string; approved: any }) => 
      (profile.role === 'admin' || profile.role === 'moderator') && profile.approved
    ).length : 0;

    return {
      totalUsers: profiles?.length || 0,
      approvedUsers: approvedUsersCount,
      onlineUsers: onlineUsers.filter(u => {
        const lastSeen = new Date(u.last_seen)
        return (Date.now() - lastSeen.getTime()) < 2 * 60 * 1000 // 2 minutes
      }).length,
      adminUsers: adminUsersCount
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      totalUsers: 0,
      approvedUsers: 0,
      onlineUsers: 0,
      adminUsers: 0
    }
  }
}

// Export types for use in other files
export type { Database } from '@/types/supabase'