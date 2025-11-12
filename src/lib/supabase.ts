import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
})

export const hasValidSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

// UserProfile type definition
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

export interface OnlineUser {
  last_seen: string
  user_agent: string
  ip_address: string
  profiles: UserProfile
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

export const getCurrentUser = async () => {
  if (!hasValidSupabaseConfig) {
    return null
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error)
    return null
  }
}

export const ensureUserExists = async (userId: string, userData: { email: string; name: string }) => {
  try {
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const { data: newUser, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name,
          approved: false,
          role: 'user',
          last_login: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }

    return newUser;
  } catch (error) {
    console.error('Error in ensureUserExists:', error);
    throw error;
  }
}

// User management functions
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
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
    return data || []
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw error
  }
}

export const updateUserProfile = async (userId: string, updates: {
  approved?: boolean
  role?: 'user' | 'moderator' | 'admin'
  name?: string
}): Promise<UserProfile> => {
  try {
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
    
    if (!data) {
      throw new Error('User not found')
    }
    
    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

export const getUserLogs = async (userId?: string): Promise<UserLog[]> => {
  try {
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
    return data || []
  } catch (error) {
    console.error('Error fetching user logs:', error)
    throw error
  }
}

// Presence tracking
export const updateOnlineStatus = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    try {
      const { error } = await supabase.rpc('update_online_status', {
        p_user_agent: navigator.userAgent,
        p_ip_address: ''
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error updating online status with function:', error)
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
  } catch (error) {
    console.error('Error in updateOnlineStatus:', error)
  }
}

export const getOnlineUsers = async (): Promise<OnlineUser[]> => {
  try {
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
          approved,
          last_login,
          created_at,
          updated_at
        )
      `)
      .gt('last_seen', fiveMinutesAgo)
      .order('last_seen', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching online users:', error)
    throw error
  }
}

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }
    
    if (!user) {
      console.log('No user found');
      return null;
    }

    console.log('Fetching profile for user:', user.id, user.email);

    // Try direct profile fetch without complex timeout logic
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      
      // If profile doesn't exist, create it immediately
      if (profileError.code === 'PGRST116') {
        console.log('Profile not found, creating...');
        try {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                approved: false,
                role: 'user',
                last_login: new Date().toISOString(),
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            return null;
          }

          console.log('New profile created:', newProfile);
          return newProfile;
        } catch (createError) {
          console.error('Error in profile creation:', createError);
          return null;
        }
      }
      return null;
    }

    console.log('Profile found:', profile);
    return profile;
  } catch (error) {
    console.error('Unexpected error in getCurrentUserProfile:', error);
    return null;
  }
};
// Helper function to check if user has admin permissions
export const hasAdminPermissions = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentUserProfile();
    return !!(profile && (profile.role === 'admin' || profile.role === 'moderator') && profile.approved);
  } catch (error) {
    console.error('Error checking admin permissions:', error);
    return false;
  }
}

// Helper function to get user role
export const getUserRole = async (): Promise<'user' | 'moderator' | 'admin' | null> => {
  try {
    const profile = await getCurrentUserProfile();
    return profile?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}