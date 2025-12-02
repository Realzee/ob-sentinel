import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { companyId } = await request.json()
    const userId = params.userId

    // Verify admin making the request
    const { data: adminUser } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', (await supabaseAdmin.auth.getUser()).data.user?.id)
      .single()

    if (!adminUser?.role?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update user company using service role
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        company_id: companyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user company:', error)
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    )
  }
}