// app/api/admin/users/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      name, 
      role, 
      companyId,  // Accept both property names
      company_id = companyId  // Default to company_id if companyId is provided
    } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Verify admin making the request
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser()
    
    if (authError || !adminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin authentication failed' },
        { status: 401 }
      )
    }

    // Check if requesting user is admin
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (profileError || !adminProfile?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser?.users?.some((u: any) => u.email === email)

    if (userExists) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create auth user using admin API
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: role || 'user',
        full_name: name || email.split('@')[0]
      }
    })

    if (createError) {
      console.error('❌ Error creating auth user:', createError)
      return NextResponse.json(
        { error: `Failed to create user: ${createError.message}` },
        { status: 500 }
      )
    }

    // Create profile record
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        name: name || email.split('@')[0],
        role: role || 'user',
        company_id: company_id || null, // Use whichever was provided
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileInsertError) {
      console.error('❌ Error creating profile:', profileInsertError)
      
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileInsertError.message}` },
        { status: 500 }
      )
    }

    // Optionally send welcome email
    try {
      // You can add email sending logic here
      // Example: await sendWelcomeEmail(email, name || email.split('@')[0])
    } catch (emailError) {
      console.warn('⚠️ Welcome email failed to send:', emailError)
      // Don't fail the whole request if email fails
    }

    // Return success response
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: authData.user.id, 
        email, 
        name: name || email.split('@')[0],
        role: role || 'user',
        companyId: company_id,
        status: 'active'
      },
      message: 'User created successfully'
    })
  } catch (error: any) {
    console.error('❌ Unhandled error in user creation:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// Optional: Add GET method to verify endpoint is accessible
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'User creation endpoint is active',
    method: 'POST',
    required_fields: ['email', 'password'],
    optional_fields: ['name', 'role', 'companyId']
  })
}