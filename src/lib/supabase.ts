import { createClient } from '@supabase/supabase-js'

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  if (isBrowser) {
    console.warn('❌ Missing Supabase environment variables')
  }
}

// Create Supabase client with optimized configuration
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: isBrowser ? localStorage : undefined,
      storageKey: 'rapid-ireport-auth',
      debug: false,
      autoRefreshToken: true
    },
    global: {
      headers: {
        'X-Client-Info': 'rapid-ireport'
      }
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

// Improved user creation with better error handling
export async function ensureUserExists(userId: string, userData: { email: string; name?: string; phone?: string }) {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured - skipping user creation')
    return null
  }

  try {
    // Check if user exists with better error handling
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle() // Use maybeSingle to avoid throwing on no rows

    if (checkError) {
      console.warn('Error checking user existence:', checkError)
      // Continue to try creation anyway
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      console.log('Creating new user profile for:', userData.email)
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: userData.email,
            name: userData.name || userData.email.split('@')[0],
            phone: userData.phone || '',
            popia_consent: true,
            consent_given_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating user profile:', createError)
        
        // If it's a duplicate error, the user might have been created by another process
        if (createError.code === '23505') { // Unique violation
          console.log('User already exists, fetching existing user...')
          const { data: fetchedUser } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', userId)
            .single()
          return fetchedUser
        }
        return null
      }
      
      console.log('User profile created successfully:', newUser?.email)
      return newUser
    }

    console.log('User profile already exists:', existingUser.email)
    return existingUser
  } catch (error) {
    console.error('Unexpected error in ensureUserExists:', error)
    return null
  }
}

// Improved auth state management
export async function getCurrentUser() {
  if (!hasValidSupabaseConfig) {
    console.warn('Supabase not configured')
    return null
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.warn('Auth session issue (non-critical):', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.warn('Unexpected error getting current user:', error)
    return null
  }
}

// Safe database operations with error handling
export async function safeDbOperation<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  fallback: T | null = null
): Promise<T | null> {
  try {
    const { data, error } = await operation()
    
    if (error) {
      console.warn('Database operation failed:', error)
      return fallback
    }
    
    return data
  } catch (error) {
    console.warn('Unexpected error in database operation:', error)
    return fallback
  }
}