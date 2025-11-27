// api/admin/users/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from auth
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const userRole = currentUser.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users using admin auth
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }

    // Transform to match AuthUser interface
    const transformedUsers = users.users.map(user => {
      // Determine user status based on available properties
      let status: 'pending' | 'active' | 'suspended' = 'active';
      
      if (!user.email_confirmed_at) {
        status = 'pending';
      }
      // You can add more sophisticated status logic here based on your needs
      // For example, check if user is banned based on your application logic

      return {
        id: user.id,
        email: user.email!,
        user_metadata: user.user_metadata || {},
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        role: user.user_metadata?.role || 'user',
        status: status
      };
    });

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from auth
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const userRole = currentUser.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userData = await request.json();

    // Create user using admin auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: userData.full_name || '',
        role: userData.role || 'user'
      }
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Failed to create user');
    }

    // Transform the created user to match AuthUser interface
    const transformedUser = {
      id: data.user.id,
      email: data.user.email!,
      user_metadata: data.user.user_metadata || {},
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at,
      last_sign_in_at: data.user.last_sign_in_at || null,
      role: data.user.user_metadata?.role || 'user',
      status: 'active' as const
    };

    return NextResponse.json(transformedUser);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from auth
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const userRole = currentUser.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prepare update data for Supabase
    const updateData: any = {};

    if (updates.role) {
      updateData.user_metadata = { role: updates.role };
    }

    if (updates.full_name) {
      updateData.user_metadata = {
        ...updateData.user_metadata,
        full_name: updates.full_name
      };
    }

    // Update user using admin auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from auth
    const { data: { user: currentUser }, error: authError } = await supabaseAdmin.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const userRole = currentUser.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // For safety, we'll just update user metadata to mark as suspended
    // instead of actually deleting the user
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { status: 'suspended' }
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error suspending user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to suspend user' }, 
      { status: 500 }
    );
  }
}