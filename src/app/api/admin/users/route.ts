// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Add this to force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get all users (with pagination and filtering)
export async function GET(request: NextRequest) {
  try {
    // Check if we're in a static generation context
    // If so, return empty response to avoid dynamic usage
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const companyId = searchParams.get('companyId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Verify admin making the request
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin authentication failed' },
        { status: 401 }
      );
    }

    // Check if requesting user is admin
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', adminUser.id)
      .single();

    if (profileError || !adminProfile?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        status,
        company_id,
        created_at,
        updated_at,
        companies (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Apply pagination and ordering
    const { data: users, error: usersError, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return NextResponse.json(
        { error: `Failed to fetch users: ${usersError.message}` },
        { status: 500 }
      );
    }

    // Format users
    const formattedUsers = users?.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      company_id: user.company_id,
      company: user.companies,
      created_at: user.created_at,
      updated_at: user.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Unhandled error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}