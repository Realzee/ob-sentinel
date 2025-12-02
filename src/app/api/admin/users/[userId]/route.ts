// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Get specific user details
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
      .select('role, company_id')
      .eq('id', adminUser.id)
      .single();

    if (profileError || !adminProfile?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get user details with company info
    const { data: user, error: userError } = await supabaseAdmin
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
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      company_id: user.company_id,
      company: user.companies,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return NextResponse.json({ 
      success: true,
      user: formattedUser
    });

  } catch (error: any) {
    console.error('❌ Unhandled error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT - Update user information
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const updates = await request.json();

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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided and allowed to update
    const allowedFields = ['name', 'company_id'];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // If no valid fields to update
    if (Object.keys(updateData).length <= 1) { // Only has updated_at
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update user
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      return NextResponse.json(
        { error: `Failed to update user: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Unhandled error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only, cannot delete self)
export async function DELETE(
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

    // Prevent self-deletion
    if (userId === adminUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
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

    // Delete user from auth (this will cascade to profiles due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Unhandled error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}