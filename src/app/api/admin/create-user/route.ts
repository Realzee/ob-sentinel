// app/api/admin/create-user/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { email, name, phone, location, role, approved, sendInvite } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Generate a secure random password
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
      let password = ''
      for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const tempPassword = generateTempPassword()

    // Create user using the service role key (this will be handled server-side)
    // Note: You'll need to set up the service role key in your environment variables
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    // Create an admin Supabase client using the service role key (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)

    // Create the user
    const { data: authData, error: authCreateError } = await adminSupabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authCreateError) {
      // If user already exists, try to get their ID and update profile
      if (authCreateError.message.includes('already registered')) {
        const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
        const existingUser = existingUsers?.users.find(u => u.email === email)
        
        if (!existingUser) {
          return NextResponse.json({ error: 'User exists but could not be found' }, { status: 400 })
        }

        // Update existing user's profile
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            name,
            phone,
            location,
            role,
            approved,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)

        if (profileUpdateError) {
          return NextResponse.json({ error: profileUpdateError.message }, { status: 400 })
        }

        return NextResponse.json({ 
          message: 'User profile updated successfully',
          user: { id: existingUser.id, email }
        })
      }
      return NextResponse.json({ error: authCreateError.message }, { status: 400 })
    }

    if (authData.user) {
      // Create profile for new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          name,
          phone,
          location,
          role,
          approved,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        // If profile creation fails, delete the auth user
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: profileError.message }, { status: 400 })
      }

      // Send invite email if requested
      if (sendInvite) {
        const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email)
        if (inviteError) {
          console.warn('Could not send invite email:', inviteError.message)
        }
      }

      return NextResponse.json({ 
        message: 'User created successfully',
        user: { id: authData.user.id, email }
      })
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 400 })

  } catch (error: any) {
    console.error('Error in create-user API:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}