// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const hasValidSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

// User profile management
export interface UserProfile {
  id: string
  email: string
  name: string | null
  approved: boolean
  role: 'user' | 'moderator' | 'admin'
  last_login: string | null
  created_at: string
  updated_at: string
  phone?: string
  location?: string
}

// Ensure user exists in database
export const ensureUserExists = async (userId: string, userData: { email: string; name?: string }) => {
  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError)
      return null
    }

    if (existingUser) {
      return existingUser
    }

    // Create new user profile
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name || null,
          approved: false,
          role: 'user',
          last_login: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating user:', createError)
      return null
    }

    return newUser
  } catch (error) {
    console.error('Error in ensureUserExists:', error)
    return null
  }
}

// Alias for ensureUserExists (for backward compatibility)
export const ensureUserProfile = ensureUserExists

// Get user profile safely
export const getSafeUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getSafeUserProfile:', error)
    return null
  }
}

// Get all users (for admin)
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all users:', error)
      return []
    }

    return profiles || []
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return []
  }
}

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
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
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateUserProfile:', error)
    return null
  }
}

// Online users functionality
export interface OnlineUser {
  id: string
  user_id: string
  last_seen: string
  online: boolean
  profiles: UserProfile
}

export const updateUserPresence = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('online_users')
      .upsert({
        user_id: userId,
        last_seen: new Date().toISOString(),
        online: true
      })

    if (error) {
      console.error('Error updating user presence:', error)
    }
  } catch (error) {
    console.error('Error in updateUserPresence:', error)
  }
}

export const getOnlineUsers = async (): Promise<OnlineUser[]> => {
  try {
    const { data: onlineUsers, error } = await supabase
      .from('online_users')
      .select(`
        *,
        profiles (*)
      `)
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

    if (error) {
      console.error('Error fetching online users:', error)
      return []
    }

    return onlineUsers || []
  } catch (error) {
    console.error('Error in getOnlineUsers:', error)
    return []
  }
}

// Clean up old online users
export const cleanupOnlineUsers = async () => {
  try {
    const { error } = await supabase
      .from('online_users')
      .delete()
      .lt('last_seen', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Older than 10 minutes

    if (error) {
      console.error('Error cleaning up online users:', error)
    }
  } catch (error) {
    console.error('Error in cleanupOnlineUsers:', error)
  }
}