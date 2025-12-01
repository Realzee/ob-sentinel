// app/api/admin/users/route.ts - UPDATED WITH DIRECT IMPORTS
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header using next/headers
    const headersList = headers();
    const authorization = headersList.get('Authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header provided' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create regular client for user verification
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is authenticated
    const { data: { user: currentUser }, error: authError } = 
      await supabase.auth.getUser(token);
    
    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user has a profile with admin role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id, full_name')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile error:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Validate admin role
    const isSuperAdmin = userProfile.role === 'admin' || userProfile.role === 'administrator';
    const isCompanyAdmin = userProfile.role === 'company_admin';
    
    if (!isSuperAdmin && !isCompanyAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all users using admin client
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: `Failed to fetch users: ${usersError.message}` },
        { status: 500 }
      );
    }

    // Filter users based on role
    let filteredUsers = users;

    if (isCompanyAdmin) {
      // Get user IDs from the same company
      const { data: companyUsers, error: companyError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', userProfile.company_id);
      
      if (companyError) {
        console.error('Error fetching company users:', companyError);
        return NextResponse.json(
          { error: 'Failed to fetch company users' },
          { status: 500 }
        );
      }

      const companyUserIds = companyUsers?.map((u: { id: string }) => u.id) || [];
      filteredUsers = users.filter((user: any) => companyUserIds.includes(user.id));
    }

    // Get additional profile data for filtered users
    const filteredUserIds = filteredUsers.map((user: any) => user.id);
    let profilesData: any[] = [];

    if (filteredUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, job_title')
        .in('id', filteredUserIds);

      if (!profilesError && profiles) {
        profilesData = profiles;
      }
    }

    // Combine user data with profile data
    const safeUsers = filteredUsers.map((user: any) => {
      const userProfileData = profilesData.find((p: any) => p.id === user.id) || {};
      
      return {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'user',
        status: user.user_metadata?.status || 'active',
        full_name: user.user_metadata?.full_name || userProfileData.full_name,
        avatar_url: userProfileData.avatar_url,
        job_title: userProfileData.job_title,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        company_id: user.user_metadata?.company_id
      };
    });

    return NextResponse.json({
      success: true,
      count: safeUsers.length,
      users: safeUsers,
      userRole: isSuperAdmin ? 'super_admin' : 'company_admin',
      currentUser: {
        id: currentUser.id,
        email: currentUser.email,
        role: userProfile.role,
        company_id: userProfile.company_id
      }
    });

  } catch (error: any) {
    console.error('Unexpected error in users API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}