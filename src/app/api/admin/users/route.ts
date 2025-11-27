// app/api/admin/users/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Starting admin users API call...');
    
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' }, 
        { status: 500 }
      );
    }

    // Initialize Supabase with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Supabase admin client created, fetching users...');

    // Get all users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Supabase admin error:', error);
      return NextResponse.json(
        { error: `Failed to fetch users: ${error.message}` }, 
        { status: 500 }
      );
    }

    console.log(`Successfully fetched ${users.length} users`);

    // Transform data
    const safeUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      status: user.user_metadata?.status || 'active',
      full_name: user.user_metadata?.full_name,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Unexpected error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}