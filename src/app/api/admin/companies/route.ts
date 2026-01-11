// app/api/admin/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Companies API called');
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token present:', !!token);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('❌ Auth error:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 User authenticated:', user.email);

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Profile error:', profileError.message);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    console.log('🎯 User role:', profile.role, 'Company ID:', profile.company_id);

    let query = supabase.from('companies').select('*');
    let queryDescription = 'all companies';

    // If user is moderator, only show their company
    if (profile.role === 'moderator' && profile.company_id) {
      query = query.eq('id', profile.company_id);
      queryDescription = `company ${profile.company_id}`;
    }

    console.log('📋 Executing query for:', queryDescription);
    const { data: companies, error } = await query.order('name');

    if (error) {
      console.error('❌ Database error:', error);
      
      // If table doesn't exist, return empty array instead of error
      if (error.message.includes('does not exist')) {
        console.log('📊 Companies table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    console.log('✅ Companies fetched:', companies?.length || 0);
    return NextResponse.json(companies || []);
  } catch (error) {
    console.error('💥 Unexpected error in companies API:', error);
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