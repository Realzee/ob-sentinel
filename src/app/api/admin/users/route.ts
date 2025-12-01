// app/api/admin/users/route.ts - UPDATED VERSION
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Add authentication check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

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

    // Verify the requesting user is an admin
    const { data: { user: currentUser }, error: authError } = 
      await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', currentUser.id)
      .single();

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'administrator')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // For admins, get all users
    // For company admins, get only users from their company
    let filteredUsers = users;

    if (userProfile.role === 'company_admin') {
      // Get user IDs from the same company
      const { data: companyUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('company_id', userProfile.company_id);
      
      const companyUserIds = companyUsers?.map(u => u.id) || [];
      filteredUsers = users.filter((user: any) => companyUserIds.includes(user.id));
    }

    const safeUsers = filteredUsers.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      status: user.user_metadata?.status || 'active',
      full_name: user.user_metadata?.full_name,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      company_id: user.user_metadata?.company_id
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}