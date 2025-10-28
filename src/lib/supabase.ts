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
    console.log('Please check your environment configuration:')
    console.log('- Local: Create .env.local file')
    console.log('- Production: Set in hosting platform')
  }
  
  // Don't throw error, just use placeholder to prevent build failures
  console.warn('Using placeholder Supabase client')
}

// Create Supabase client (will use placeholders if env vars missing)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
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