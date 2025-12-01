// app/api/admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    let query = supabase.from('companies').select('*');

    // If user is moderator, only show their company
    if (profile.role === 'moderator' && profile.company_id) {
      query = query.eq('id', profile.company_id);
    }

    const { data: companies, error } = await query.order('name');

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error in companies API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert([
        { 
          name, 
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}