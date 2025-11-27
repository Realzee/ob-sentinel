// scripts/ensure-admin-user.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function ensureAdminUser() {
  try {
    console.log('🔍 Checking for admin user: zweli@msn.com');
    
    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }

    const existingUser = users.users.find(user => user.email === 'zweli@msn.com');
    
    if (existingUser) {
      console.log('✅ User zweli@msn.com exists, updating to admin role...');
      
      // Update user to admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: { 
            ...existingUser.user_metadata,
            role: 'admin',
            full_name: 'Zweli Admin'
          }
        }
      );
      
      if (updateError) {
        console.error('❌ Error updating user:', updateError);
      } else {
        console.log('✅ Successfully updated zweli@msn.com to admin role');
      }
    } else {
      console.log('❌ User zweli@msn.com not found. Please create the user first through the registration process.');
    }
  } catch (error) {
    console.error('❌ Error ensuring admin user:', error);
  }
}

// Run the function
ensureAdminUser();