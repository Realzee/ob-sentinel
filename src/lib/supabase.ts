import { createClient } from '@supabase/supabase-js'

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (isBrowser) {
    console.error('❌ Missing Supabase environment variables')
  }
  console.warn('Using placeholder Supabase client')
}

// Create Supabase client with better error handling
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    }
  }
)

// Helper to check if we have real credentials
export const hasValidSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

// Helper function to get current SA time
export function getSATimestamp(): string {
  return new Date().toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Safe user creation function to fix foreign key constraints
export async function ensureUserExists(userId: string, userData: { email: string; name?: string; phone?: string }) {
  if (!hasValidSupabaseConfig) return null

  try {
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code === 'PGRST116') { // Not found
      // Create user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            phone: userData.phone || '',
            popia_consent: true,
            consent_given_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return null
      }
      return newUser
    }

    return existingUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    return null
  }
}