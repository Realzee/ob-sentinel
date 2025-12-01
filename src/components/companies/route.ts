// app/api/admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user
    const { data: { user }, error: authError } = 
      await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'administrator', 'company_admin'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get companies with user counts
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        *,
        user_count:profiles(count)
      `);

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Format response
    const formattedCompanies = companies.map(company => ({
      ...company,
      user_count: company.user_count?.[0]?.count || 0
    }));

    return NextResponse.json(formattedCompanies);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}