// app/api/admin/users/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Check authorization using the admin client
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the token using the admin client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role from user_metadata
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all users using admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform the data to include only necessary fields
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
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}