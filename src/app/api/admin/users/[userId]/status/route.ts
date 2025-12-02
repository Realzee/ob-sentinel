// app/api/admin/users/[userId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { status } = await request.json();

    // Validate input
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status is one of allowed values
    const allowedStatuses = ['active', 'pending', 'suspended'];
    if (!allowedStatuses.includes(status.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid status. Allowed: active, pending, suspended' },
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
      .select('id, email')
      .eq('id', userId)
      .single();

    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent self-suspension
    if (userId === adminUser.id && status === 'suspended') {
      return NextResponse.json(
        { error: 'Cannot suspend yourself' },
        { status: 403 }
      );
    }

    // Update user status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        status: status.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating user status:', updateError);
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If suspending user, optionally revoke their auth sessions
    if (status.toLowerCase() === 'suspended') {
      try {
        await supabaseAdmin.auth.admin.signOut(userId);
      } catch (signOutError) {
        console.warn('⚠️ Could not sign out user, continuing:', signOutError);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `User status updated to ${status.toLowerCase()} successfully`,
      user: {
        id: userExists.id,
        email: userExists.email,
        status: status.toLowerCase()
      }
    });

  } catch (error: any) {
    console.error('❌ Unhandled error in status update:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// Optional: GET method to retrieve user status
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

    // Get user status
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, status')
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
        status: user.status
      }
    });

  } catch (error: any) {
    console.error('❌ Unhandled error fetching user status:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}