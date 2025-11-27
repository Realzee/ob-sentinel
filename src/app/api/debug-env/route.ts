// app/api/debug-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Check all possible environment variable names
  const envCheck = {
    // Current expected names
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ EXISTS' : '❌ MISSING',
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ EXISTS' : '❌ MISSING',
    
    // Previous name you used
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY': process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? '✅ EXISTS' : '❌ MISSING',
    
    // Other possible names
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ EXISTS' : '❌ MISSING',
  };

  return NextResponse.json(envCheck);
}