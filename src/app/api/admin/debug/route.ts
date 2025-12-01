// app/api/admin/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Debug info
    const debugInfo = {
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        company_id: profile.company_id
      },
      tables: {} as any
    };

    // Check if companies table exists and get data
    try {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .limit(10);

      debugInfo.tables.companies = {
        exists: !companiesError,
        error: companiesError?.message,
        count: companies?.length || 0,
        data: companies || []
      };
    } catch (e) {
      debugInfo.tables.companies = {
        exists: false,
        error: (e as Error).message
      };
    }

    // Check profiles table
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role, company_id')
        .limit(5);

      debugInfo.tables.profiles = {
        exists: !profilesError,
        error: profilesError?.message,
        count: profiles?.length || 0,
        data: profiles || []
      };
    } catch (e) {
      debugInfo.tables.profiles = {
        exists: false,
        error: (e as Error).message
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}