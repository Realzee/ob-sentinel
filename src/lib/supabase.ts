import { createClient } from '@supabase/supabase-js'

// For development, allow missing env vars with a warning
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// If environment variables are missing, show helpful error
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    // Client-side error
    console.error('❌ Missing Supabase environment variables')
    console.log('Please create a .env.local file with:')
    console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  }
  
  // Use placeholder values to prevent build errors
  supabaseUrl = 'https://placeholder.supabase.co'
  supabaseAnonKey = 'placeholder-key'
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

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

// Check if we're using placeholder credentials
export const isUsingPlaceholderCredentials = 
  supabaseUrl === 'https://placeholder.supabase.co' || 
  supabaseAnonKey === 'placeholder-key'