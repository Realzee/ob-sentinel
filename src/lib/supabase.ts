import { createBrowserClient } from '@supabase/ssr'

// Only declare supabase once at the top
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// User profile functions
export async function ensureUserProfile(userId: string, userData: { email: string, name?: string }) {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingProfile) {
      return existingProfile
    }

    // Create new profile
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        role: 'user',
        approved: false
      })
      .select()
      .single()

    if (error) throw error
    return newProfile

  } catch (error) {
    console.error('Error ensuring user profile:', error)
    throw error
  }
}

export async function getSafeUserProfile(userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
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

export async function ensureUserExists(userId: string, userData: { email: string, name?: string }) {
  return ensureUserProfile(userId, userData)
}

// Remove any duplicate supabase declaration that might be at the bottom