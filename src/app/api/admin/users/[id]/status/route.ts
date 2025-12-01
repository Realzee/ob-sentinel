// app/api/admin/users/[id]/status/route.ts - UPDATED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user: currentUser }, error: authError } = 
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id, status')
      .eq('id', currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // CHECK: Verify user has admin/mod role
    const allowedRoles = ['admin', 'administrator', 'company_admin', 'moderator'];
    if (!allowedRoles.includes(currentProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { status } = await request.json();

    if (!status || !['active', 'pending', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Get target user profile
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('role, company_id, status')
      .eq('id', params.id)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Permission hierarchy:
    // 1. Super admins can manage anyone
    // 2. Company admins can manage users in their company (except other admins)
    // 3. Moderators can manage non-admin users in their company
    const isSuperAdmin = ['admin', 'administrator'].includes(currentProfile.role);
    const isCompanyAdmin = currentProfile.role === 'company_admin';
    const isModerator = currentProfile.role === 'moderator';

    // Check company access for non-super-admins
    if (!isSuperAdmin) {
      // Must be in same company
      if (targetProfile.company_id !== currentProfile.company_id) {
        return NextResponse.json(
          { error: 'Cannot manage users from other companies' },
          { status: 403 }
        );
      }

      // Company admins cannot manage other admins
      if (isCompanyAdmin && ['admin', 'administrator', 'company_admin'].includes(targetProfile.role)) {
        return NextResponse.json(
          { error: 'Cannot manage other administrators' },
          { status: 403 }
        );
      }

      // Moderators cannot manage admins or other moderators
      if (isModerator && ['admin', 'administrator', 'company_admin', 'moderator'].includes(targetProfile.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to manage this user' },
          { status: 403 }
        );
      }
    }

    // Update user status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Also update auth metadata if needed
    if (isSuperAdmin) {
      await supabase.auth.admin.updateUserById(params.id, {
        user_metadata: { status }
      });
    }

    return NextResponse.json({ 
      success: true,
      message: `User status updated to ${status}`
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}