// pages/api/admin/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Extended User type to include banned_until
interface AdminUser {
  id: string;
  email?: string;
  user_metadata: any;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  invited_at?: string;
  banned_until?: string | null;
}

function getUserStatus(user: AdminUser): string {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return 'suspended';
  }
  if (user.invited_at && !user.confirmed_at) {
    return 'pending';
  }
  return 'active';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all users from Auth
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
          console.error('Auth admin error:', error);
          return res.status(500).json({ error: error.message });
        }

        // Transform auth users to our format
        const formattedUsers = (users as AdminUser[]).map(user => ({
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata || {},
          created_at: user.created_at,
          updated_at: user.updated_at,
          last_sign_in_at: user.last_sign_in_at,
          confirmed_at: user.confirmed_at,
          email_confirmed_at: user.email_confirmed_at,
          invited_at: user.invited_at,
          role: user.user_metadata?.role || 'user',
          status: getUserStatus(user),
          banned_until: user.banned_until
        }));

        res.json({ users: formattedUsers });
        break;

      case 'POST':
        const { action, userId, role, status, ...userData } = req.body;

        switch (action) {
          case 'updateRole':
            if (!userId || !role) {
              return res.status(400).json({ error: 'Missing userId or role' });
            }

            const { data: existingUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (!existingUserData || !existingUserData.user) {
              return res.status(404).json({ error: 'User not found' });
            }

            const existingUser = existingUserData.user;
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              { 
                user_metadata: { 
                  ...existingUser.user_metadata,
                  role 
                } 
              }
            );

            if (updateError) {
              return res.status(500).json({ error: updateError.message });
            }

            res.json({ success: true });
            break;

          case 'createUser':
            const { email, password, full_name } = userData;

            if (!email || !password) {
              return res.status(400).json({ error: 'Missing email or password' });
            }

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: {
                full_name: full_name || '',
                role: role || 'user'
              }
            });

            if (createError) {
              return res.status(500).json({ error: createError.message });
            }

            res.json({ 
              user: {
                id: newUser.user.id,
                email: newUser.user.email,
                user_metadata: newUser.user.user_metadata,
                created_at: newUser.user.created_at,
                status: 'active'
              }
            });
            break;

          case 'updateStatus':
            if (!userId || !status) {
              return res.status(400).json({ error: 'Missing userId or status' });
            }

            let updateData: any = {};
            if (status === 'suspended') {
              updateData.ban_duration = '87600h'; // 10 years effectively permanent
            } else if (status === 'active') {
              updateData.ban_duration = 'none';
            }

            const { error: statusError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              updateData
            );

            if (statusError) {
              return res.status(500).json({ error: statusError.message });
            }

            res.json({ success: true });
            break;

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: error.message });
  }
}