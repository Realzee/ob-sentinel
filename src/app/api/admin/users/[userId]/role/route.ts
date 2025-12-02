// app/api/admin/users/[userId]/role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { role } = await request.json();

    // Validate input
    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      );
    }

    // Validate role is one of allowed values
    const allowedRoles = ['admin', 'moderator', 'controller', 'user'];
    if (!allowedRoles.includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid role. Allowed: admin, moderator, controller, user' },
        { status: 400 }
      );
    }

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
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (profileError || !adminProfile?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Check if user exists
    const { data: userExists } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent self-demotion check (optional)
    if (userId === adminUser.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot remove admin role from yourself' },
        { status: 403 }
      );
    }

    // Update user role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: role.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating user role:', updateError);
      return NextResponse.json(
        { error: `Failed to update role: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Also update user_metadata in auth for consistency
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: role.toLowerCase() }
    });

    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${role.toLowerCase()} successfully`
    });

  } catch (error: any) {
    console.error('❌ Unhandled error in role update:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Optional: GET method to retrieve user role
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

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
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (profileError || !adminProfile?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get user role
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('❌ Unhandled error fetching user role:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}