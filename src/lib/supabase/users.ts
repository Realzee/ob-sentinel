import { supabase } from '../../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'user' | 'moderator' | 'admin'
  approved: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  metadata: any
}

// Enhanced user profile creation with better error handling
export const ensureUserProfile = async (
  userId: string, 
  profileData: { email: string; name?: string }
): Promise<UserProfile> => {
  try {
    console.log('🔄 Ensuring user profile for:', userId)
    
    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching profile:', fetchError)
      throw fetchError
    }

    if (existingProfile) {
      console.log('✅ Existing profile found:', existingProfile.email)
      return existingProfile
    }

    // Create new profile
    console.log('📝 Creating new profile for:', profileData.email)
    const newProfile = {
      id: userId,
      email: profileData.email,
      name: profileData.name || null,
      role: 'user' as const,
      approved: false,
      verification_status: 'pending' as const,
      is_active: true,
      last_login: new Date().toISOString(),
      metadata: {}
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      
      // If it's a duplicate, try to fetch again
      if (createError.code === '23505') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (profile) {
          console.log('✅ Profile found after duplicate error:', profile.email)
          return profile
        }
      }
      throw createError
    }

    if (!createdProfile) {
      throw new Error('Failed to create user profile - no data returned')
    }

    console.log('✅ New profile created successfully:', createdProfile.email)
    return createdProfile

  } catch (error: any) {
    console.error('❌ Error in ensureUserProfile:', error)
    throw new Error(`Failed to ensure user profile: ${error.message}`)
  }
}

// Safe user profile fetch with better logging
export const getSafeUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('🔄 Fetching user profile for:', userId)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('📭 No profile found for user:', userId)
        return null
      }
      console.error('❌ Error fetching user profile:', error)
      return null
    }

    console.log('✅ Profile fetched successfully:', data?.email)
    return data
  } catch (error) {
    console.error('❌ Unexpected error in getSafeUserProfile:', error)
    return null
  }
}

// Update user profile
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> => {
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

    if (!data) {
      throw new Error('No data returned after profile update')
    }

    console.log('✅ Profile updated successfully:', data.email)
    return data
  } catch (error) {
    console.error('❌ Error in updateUserProfile:', error)
    throw error
  }
}