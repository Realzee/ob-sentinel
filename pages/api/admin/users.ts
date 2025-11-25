// pages/api/admin/users.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all users from Auth
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Auth admin error:', error);
        return res.status(500).json({ error: error.message });
      }

      // Transform auth users to our format
      const formattedUsers = users.map(user => ({
  id: user.id,
  email: user.email || '',
  user_metadata: user.user_metadata || {},
  created_at: user.created_at,
  updated_at: user.updated_at,
  last_sign_in_at: user.last_sign_in_at,
  role: user.user_metadata?.role || 'user',
  status: getUserStatus(user) // This now returns UserStatus
}));

      res.json({ users: formattedUsers });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: error.message });
  }
}

function getUserStatus(user: any): string {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return 'suspended';
  }
  if (user.invited_at && !user.confirmed_at) {
    return 'pending';
  }
  return 'active';
}