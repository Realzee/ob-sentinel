// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

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
  avatar_url?: string
}

// Enhanced error handling type (for new functions)
export interface SupabaseResult<T> {
  data: T | null
  error: Error | null
  success: boolean
}

// Ensure user exists in database (maintains backward compatibility)
export const ensureUserExists = async (
  userId: string, 
  userData: { email: string; name?: string; avatar_url?: string }
): Promise<UserProfile | null> => {
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
      // Update last login for existing user
      const { data: updatedUser } = await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      return updatedUser || existingUser
    }

    // Create new user profile
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name || null,
          avatar_url: userData.avatar_url || null,
          approved: false,
          role: 'user',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
    console.error('Unexpected error in ensureUserExists:', error)
    return null
  }
}

// Alias for ensureUserExists (for backward compatibility)
export const ensureUserProfile = ensureUserExists

// Get user profile safely (maintains backward compatibility)
export const getSafeUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle instead of single to avoid errors

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

// Get all users (for admin) - maintains backward compatibility
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
    console.error('Unexpected error in getAllUsers:', error)
    return []
  }
}

// Update user profile (maintains backward compatibility)
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile | null> => {
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
    console.error('Unexpected error in updateUserProfile:', error)
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

export const updateUserPresence = async (userId: string): Promise<boolean> => {
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
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error in updateUserPresence:', error)
    return false
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
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('last_seen', { ascending: false })

    if (error) {
      console.error('Error fetching online users:', error)
      return []
    }

    return onlineUsers || []
  } catch (error) {
    console.error('Unexpected error in getOnlineUsers:', error)
    return []
  }
}

// Clean up old online users
export const cleanupOnlineUsers = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('online_users')
      .delete()
      .lt('last_seen', new Date(Date.now() - 10 * 60 * 1000).toISOString())

    if (error) {
      console.error('Error cleaning up online users:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Unexpected error in cleanupOnlineUsers:', error)
    return false
  }
}

// NEW FUNCTIONS WITH ENHANCED RESULT TYPE (for new code)

// Get user profile with enhanced result
export const getUserProfileEnhanced = async (userId: string): Promise<SupabaseResult<UserProfile>> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: profile, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Get user profile by email with enhanced result
export const getUserProfileByEmail = async (email: string): Promise<SupabaseResult<UserProfile>> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: profile, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Get users with pagination (enhanced result)
export const getUsersPaginated = async (
  page: number = 1, 
  limit: number = 10
): Promise<SupabaseResult<{ users: UserProfile[], total: number }>> => {
  try {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: users, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      return { data: null, error, success: false }
    }

    return { 
      data: { 
        users: users || [], 
        total: count || 0 
      }, 
      error: null, 
      success: true 
    }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Delete user profile (admin only) - enhanced result
export const deleteUserProfileEnhanced = async (userId: string): Promise<SupabaseResult<boolean>> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: true, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Set user offline - enhanced result
export const setUserOfflineEnhanced = async (userId: string): Promise<SupabaseResult<boolean>> => {
  try {
    const { error } = await supabase
      .from('online_users')
      .update({ online: false })
      .eq('user_id', userId)

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: true, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Search users by name or email - enhanced result
export const searchUsersEnhanced = async (query: string): Promise<SupabaseResult<UserProfile[]>> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: profiles || [], error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Get users by role - enhanced result
export const getUsersByRoleEnhanced = async (role: UserProfile['role']): Promise<SupabaseResult<UserProfile[]>> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error, success: false }
    }

    return { data: profiles || [], error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Update user role (admin only) - enhanced result
export const updateUserRoleEnhanced = async (
  userId: string, 
  role: UserProfile['role']
): Promise<SupabaseResult<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error, success: false }
    }

    return { data, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Use a direct query without policies that might cause recursion
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error)
    return null
  }
}

// Approve user (admin/moderator only) - enhanced result
export const approveUserEnhanced = async (userId: string): Promise<SupabaseResult<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error, success: false }
    }

    return { data, error: null, success: true }
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error'), 
      success: false 
    }
  }
}

// Utility function to check if user is approved
export const isUserApproved = async (userId: string): Promise<boolean> => {
  const profile = await getSafeUserProfile(userId)
  return profile?.approved || false
}

// Utility function to get user role
export const getUserRole = async (userId: string): Promise<UserProfile['role'] | null> => {
  const profile = await getSafeUserProfile(userId)
  return profile?.role || null
}