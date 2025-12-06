// lib/api/user-api.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { AuthUser, UserRole, UserStatus } from '@/lib/supabase';
import { cookies } from 'next/headers';

export class UserAPI {
  private async getClient() {
    const cookieStore = cookies();
    return createClient(cookieStore);
  }

  /**
   * Get all users with proper role-based filtering
   */
  async getAllUsers(currentUserRole: UserRole, currentUserCompanyId?: string): Promise<AuthUser[]> {
    try {
      const supabase = await this.getClient();
      
      // First, get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const currentUser = session.user;
      const currentUserRoleFromMetadata = currentUser.user_metadata?.role || 'user';
      
      console.log('🔍 Current user debug:', {
        userId: currentUser.id,
        email: currentUser.email,
        metadataRole: currentUserRoleFromMetadata,
        passedRole: currentUserRole,
        companyId: currentUserCompanyId
      });

      // Start building the query
      let query = supabase.from('auth_users').select('*');

      // Apply role-based filtering
      switch (currentUserRoleFromMetadata) {
        case 'admin':
          // Admins see all users
          break;

        case 'moderator':
          // Moderators see only users from their company
          if (currentUserCompanyId) {
            query = query.eq('company_id', currentUserCompanyId);
          } else {
            // If moderator doesn't have company, they see nothing
            return [];
          }
          break;

        case 'controller':
          // Controllers see only users from their company
          if (currentUserCompanyId) {
            query = query.eq('company_id', currentUserCompanyId);
          } else {
            return [];
          }
          break;

        default:
          // Regular users see only themselves
          query = query.eq('id', currentUser.id);
          break;
      }

      const { data: users, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      console.log('✅ Fetched users:', users?.length || 0);
      
      // Transform to AuthUser type
      const authUsers: AuthUser[] = (users || []).map(user => ({
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.user_metadata?.full_name || '',
          role: user.user_metadata?.role || 'user',
          avatar_url: user.user_metadata?.avatar_url
        },
        role: user.user_metadata?.role || 'user',
        status: user.status || 'active',
        company_id: user.company_id || null,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        phone: user.phone || '',
        confirmed_at: user.confirmed_at,
        email_confirmed_at: user.email_confirmed_at,
        banned_until: user.banned_until,
        invited_at: user.invited_at,
        is_sso_user: user.is_sso_user || false,
        deleted_at: user.deleted_at
      }));

      return authUsers;

    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    full_name?: string;
    role: UserRole;
    company_id?: string;
  }) {
    try {
      const supabase = await this.getClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Check if current user has permission to create users
      const currentUserRole = session.user.user_metadata?.role;
      if (!['admin', 'moderator'].includes(currentUserRole)) {
        throw new Error('Insufficient permissions');
      }

      // Validate moderator can only assign to their company
      if (currentUserRole === 'moderator') {
        const moderatorCompany = session.user.user_metadata?.company_id;
        if (userData.company_id && userData.company_id !== moderatorCompany) {
          throw new Error('Moderators can only assign users to their own company');
        }
        userData.company_id = moderatorCompany;
      }

      // Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name || '',
          role: userData.role,
          company_id: userData.company_id
        }
      });

      if (authError) {
        throw authError;
      }

      // Update the user's status in the users table
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            status: 'active',
            company_id: userData.company_id,
            role: userData.role
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('Error updating user metadata:', updateError);
        }
      }

      return authData.user;

    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole) {
    try {
      const supabase = await this.getClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Check permissions
      const currentUserRole = session.user.user_metadata?.role;
      if (!['admin', 'moderator'].includes(currentUserRole)) {
        throw new Error('Insufficient permissions');
      }

      // Update in auth.users table (metadata)
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            role: role,
            ...(session.user.user_metadata || {})
          }
        }
      );

      if (authError) {
        throw authError;
      }

      // Update in users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ role: role })
        .eq('id', userId);

      if (dbError) {
        throw dbError;
      }

      return true;

    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: UserStatus) {
    try {
      const supabase = await this.getClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Check permissions
      const currentUserRole = session.user.user_metadata?.role;
      if (!['admin', 'moderator'].includes(currentUserRole)) {
        throw new Error('Insufficient permissions');
      }

      // Update in users table
      const { error } = await supabase
        .from('users')
        .update({ status: status })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      return true;

    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    try {
      const supabase = await this.getClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Check permissions (only admin can delete)
      const currentUserRole = session.user.user_metadata?.role;
      if (currentUserRole !== 'admin') {
        throw new Error('Only admins can delete users');
      }

      // Soft delete from users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          status: 'suspended',
          deleted_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (dbError) {
        throw dbError;
      }

      // Hard delete from auth (admin only)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        throw authError;
      }

      return true;

    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Assign user to company
   */
  async assignUserToCompany(userId: string, companyId: string) {
    try {
      const supabase = await this.getClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Check permissions
      const currentUserRole = session.user.user_metadata?.role;
      if (currentUserRole !== 'admin') {
        throw new Error('Only admins can assign companies');
      }

      // Update in auth metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            company_id: companyId
          }
        }
      );

      if (authError) {
        throw authError;
      }

      // Update in users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ company_id: companyId })
        .eq('id', userId);

      if (dbError) {
        throw dbError;
      }

      return true;

    } catch (error) {
      console.error('Error assigning user to company:', error);
      throw error;
    }
  }
}

export const userAPI = new UserAPI();