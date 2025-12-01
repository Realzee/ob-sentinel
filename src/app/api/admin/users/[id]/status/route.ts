// app/api/admin/users/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile to check permissions
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { status } = await request.json();

    if (!status || !['active', 'pending', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    // Check if target user exists and get their company
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', params.id)
      .single();

    if (targetError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions - moderators can only manage users in their company
    if (currentProfile.role === 'moderator') {
      if (targetProfile.company_id !== currentProfile.company_id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Update user status in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}