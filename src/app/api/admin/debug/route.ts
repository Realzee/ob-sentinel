// app/api/admin/debug/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface DebugInfo {
  environment: {
    nodeEnv: string | undefined;
    hasSupabaseUrl: boolean;
    hasServiceKey: boolean;
    urlLength: number;
    keyLength: number;
  };
  user: {
    id: string;
    email: string | undefined;
    role: any;
    company_id: any;
    full_name: any;
    isAuthenticated: boolean;
  };
  database: {
    connection: string;
    connectionError?: string;
  };
  tables: Record<string, any>;
  auth: Record<string, any>;
  rls?: {
    canReadOwnProfile: boolean;
    error?: string;
  };
}

interface TableCheckResult {
  exists: boolean;
  error?: string;
  count?: number;
  data?: any[];
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get authorization header using next/headers
    const headersList = headers();
    const authorization = headersList.get('Authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'No authorization header provided' },
        { status: 401 }
      );
    }

    const token = authorization.replace('Bearer ', '');
    
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Missing environment variables',
          environment: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          }
        },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token', details: authError?.message },
        { status: 401 }
      );
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, company_id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Profile not found', details: profileError.message },
        { status: 404 }
      );
    }

    // Debug info
    const debugInfo: DebugInfo = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        keyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      },
      user: {
        id: user.id,
        email: user.email || undefined,
        role: profile.role,
        company_id: profile.company_id,
        full_name: profile.full_name,
        isAuthenticated: true
      },
      database: {
        connection: 'checking...'
      },
      tables: {},
      auth: {}
    };

    // Test database connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      debugInfo.database.connection = testError ? 'failed' : 'success';
      if (testError) {
        debugInfo.database.connectionError = testError.message;
      }
    } catch (e) {
      debugInfo.database.connection = 'exception';
      debugInfo.database.connectionError = (e as Error).message;
    }

    // Check auth.users via admin API
    try {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
        perPage: 5
      });

      debugInfo.auth = {
        totalUsers: users?.length || 0,
        error: usersError?.message,
        sampleUsers: users?.slice(0, 3).map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        })) || []
      };
    } catch (e) {
      debugInfo.auth = {
        error: (e as Error).message
      };
    }

    // Helper function to check tables
    const checkTable = async (tableName: string, columns: string = '*', limit: number = 5): Promise<TableCheckResult> => {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select(columns, { count: 'exact' })
          .limit(limit);

        return {
          exists: !error,
          error: error?.message,
          count: count || data?.length || 0,
          data: data || []
        };
      } catch (e) {
        return {
          exists: false,
          error: (e as Error).message
        };
      }
    };

    // Check companies table
    debugInfo.tables.companies = await checkTable('companies', '*', 10);
    
    // Check profiles table
    debugInfo.tables.profiles = await checkTable('profiles', 'id, email, role, company_id, created_at', 5);

    // Check for other important tables
    const tablesToCheck = ['invitations', 'audit_logs', 'user_sessions'];
    
    for (const tableName of tablesToCheck) {
      debugInfo.tables[tableName] = await checkTable(tableName, '*', 2);
    }

    // Check RLS policies (if accessible)
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email || '');

      debugInfo.rls = {
        canReadOwnProfile: !policiesError && policies && policies.length > 0,
        error: policiesError?.message
      };
    } catch (e) {
      const error = e as Error;
      debugInfo.rls = {
        canReadOwnProfile: false,
        error: error.message
      };
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      ...debugInfo
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug failed',
        message: error.message,
        responseTime: `${responseTime}ms`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}