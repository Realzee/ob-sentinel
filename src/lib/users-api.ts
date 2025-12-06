// lib/users-api.ts
import { supabase, UserRole, UserStatus } from './supabase';

export interface SystemUser {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: UserStatus;
  company_id?: string;
  company_name?: string;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string;
}

export const usersAPI = {
  // Get all users with role-based filtering
  getAllUsers: async (currentUserRole: UserRole, currentUserCompanyId?: string): Promise<SystemUser[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        return [];
      }

      // Start building the query
      let query = supabase
        .from('profiles')
        .select(`
          *,
          companies (
            name
          )
        `);

      // Apply role-based filters
      if (currentUserRole === 'moderator' && currentUserCompanyId) {
        // Moderators can only see users from their company
        query = query.eq('company_id', currentUserCompanyId);
      } else if (currentUserRole === 'controller' && currentUserCompanyId) {
        // Controllers can only see users from their company
        query = query.eq('company_id', currentUserCompanyId);
      } else if (currentUserRole === 'admin') {
        // Admins can see all users
        // No filter needed
      } else {
        // Other roles cannot view user management
        console.log('User does not have permission to view user management');
        return [];
      }

      const { data: profiles, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      if (!profiles) {
        console.log('No profiles found');
        return [];
      }

      // Transform data to SystemUser format
      return profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as UserRole,
        status: profile.status as UserStatus,
        company_id: profile.company_id,
        company_name: profile.companies?.name,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }));

    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  },

  // Create a new user
  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
    company_id?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role || 'user'
        }
      });

      if (authError) {
        console.error('Auth error creating user:', authError);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'User creation failed' };
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role || 'user',
          status: 'active' as UserStatus,
          company_id: userData.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        return { success: false, error: profileError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Update user
  updateUser: async (
    userId: string, 
    updates: {
      full_name?: string;
      role?: UserRole;
      status?: UserStatus;
      company_id?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete user
  deleteUser: async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        return { success: false, error: profileError.message };
      }

      // Then delete the auth user (requires admin client)
      const { getSupabaseAdmin } = await import('./supabase');
      const adminClient = getSupabaseAdmin();
      
      if (adminClient) {
        const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
        if (authError) {
          console.warn('Could not delete auth user (may not have admin access):', authError);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  }
};