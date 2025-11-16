import { supabase } from '../supabase'
import { ensureUserProfile, getSafeUserProfile } from './users'

export interface AuthUser {
  id: string
  email: string
  user_metadata: any
}

export interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
  profile?: any
}

// Enhanced login with proper profile handling
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    console.log('🔐 Attempting login for:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })

    if (error) {
      console.error('❌ Login error:', error)
      return {
        success: false,
        error: getFriendlyAuthError(error)
      }
    }

    if (!data.user) {
      console.error('❌ No user data returned from login')
      return {
        success: false,
        error: 'Login failed. Please try again.'
      }
    }

    console.log('✅ Login successful for user:', data.user.id)

    // Ensure user profile exists or create one
    let profile
    try {
      profile = await ensureUserProfile(data.user.id, {
        email: data.user.email!,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
      })
      console.log('✅ Profile ensured:', profile?.email)
    } catch (profileError: any) {
      console.error('❌ Profile creation error:', profileError)
      return {
        success: false,
        error: 'Failed to setup user profile. Please contact support.'
      }
    }

    // Update last login
    await updateLastLogin(data.user.id)

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        user_metadata: data.user.user_metadata
      },
      profile
    }

  } catch (error: any) {
    console.error('❌ Unexpected login error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}

// Enhanced session management
export const getCurrentSession = async () => {
  try {
    console.log('🔄 Checking current session...')
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Session error:', error)
      return null
    }

    if (!session?.user) {
      console.log('📭 No active session found')
      return null
    }

    console.log('✅ Session found for user:', session.user.id)

    // Get user profile
    const profile = await getSafeUserProfile(session.user.id)
    if (!profile) {
      console.error('❌ No profile found for user:', session.user.id)
      // Try to create profile if it doesn't exist
      try {
        const newProfile = await ensureUserProfile(session.user.id, {
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
        })
        console.log('✅ Created missing profile:', newProfile.email)
        return { session, profile: newProfile }
      } catch (createError) {
        console.error('❌ Failed to create missing profile:', createError)
        return null
      }
    }

    console.log('✅ Profile loaded:', profile.email)
    return { session, profile }
  } catch (error) {
    console.error('❌ Error getting session:', error)
    return null
  }
}

// Update last login
const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
    console.log('✅ Last login updated for user:', userId)
  } catch (error) {
    console.error('❌ Error updating last login:', error)
  }
}

// User-friendly error messages
const getFriendlyAuthError = (error: any): string => {
  const message = error.message?.toLowerCase() || ''
  
  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.'
  }
  
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before logging in.'
  }
  
  if (message.includes('too many requests')) {
    return 'Too many login attempts. Please try again in a few minutes.'
  }
  
  return 'Login failed. Please check your credentials and try again.'
}