// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, status } = body;

    // Prepare update data
    const updateData: any = {};
    
    if (role) {
      updateData.user_metadata = { role };
    }
    
    if (status) {
      // For status, you might want to store it in user_metadata
      updateData.user_metadata = {
        ...updateData.user_metadata,
        status
      };
    }

    // Update user in Supabase Auth
    const { data, error } = await supabase.auth.admin.updateUserById(
      id,
      updateData
    );

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}