import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export const hasValidSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

export const getCurrentUser = async () => {
  if (!hasValidSupabaseConfig) {
    return null
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const ensureUserExists = async (userId: string, userData: { email: string; name?: string }) => {
  if (!hasValidSupabaseConfig) {
    return null
  }

  try {
    // Check if user already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingUser) {
      // Update last login
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId)
      
      return existingUser
    }

    // Create new user profile
    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name,
          last_login: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return null
    }

    return newUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    return null
  }
}

// User management functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export const getAllUsers = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator') || !profile.approved) {
    throw new Error('Insufficient permissions')
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const updateUserProfile = async (userId: string, updates: {
  approved?: boolean
  role?: 'user' | 'moderator' | 'admin'
  name?: string
}) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!currentUserProfile || (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'moderator') || !currentUserProfile.approved) {
    throw new Error('Insufficient permissions')
  }
  
  // Only admins can assign admin role
  if (updates.role === 'admin' && currentUserProfile.role !== 'admin') {
    throw new Error('Only admins can assign admin role')
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getUserLogs = async (userId?: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator') || !profile.approved) {
    throw new Error('Insufficient permissions')
  }
  
  let query = supabase
    .from('user_logs')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (userId) {
    query = query.eq('user_id', userId)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

// Presence tracking
export const updateOnlineStatus = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  try {
    const { error } = await supabase.rpc('update_online_status', {
      p_user_agent: navigator.userAgent,
      p_ip_address: ''
    })
    
    if (error) throw error
  } catch (error) {
    console.error('Error updating online status:', error)
    // Fallback to direct table update if function doesn't exist
    const { error: upsertError } = await supabase
      .from('online_users')
      .upsert({
        id: user.id,
        last_seen: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: ''
      })
    
    if (upsertError) console.error('Fallback online status update failed:', upsertError)
  }
}

export const getOnlineUsers = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator') || !profile.approved) {
    throw new Error('Insufficient permissions')
  }
  
  // Get users active in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('online_users')
    .select(`
      last_seen,
      user_agent,
      ip_address,
      profiles (
        id,
        name,
        email,
        role,
        approved
      )
    `)
    .gt('last_seen', fiveMinutesAgo)
    .order('last_seen', { ascending: false })
  
  if (error) throw error
  return data
}

export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  return profile
}