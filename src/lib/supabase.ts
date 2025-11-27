// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

// Types
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    role?: UserRole;
    full_name?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name?: string;
  role?: UserRole;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  full_name?: string;
  role?: UserRole;
  status?: UserStatus;
}

// Report types for ControlRoomDashboard
export interface VehicleAlert {
  id: string;
  license_plate: string;
  alert_type: string;
  status: 'active' | 'resolved' | 'closed'; // Added 'resolved' and 'closed'
  location: string;
  created_at: string;
  updated_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical'; // Added 'critical'
  description?: string;
}

export interface CrimeReport {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'closed' | 'resolved'; // Added 'resolved'
  priority: 'low' | 'medium' | 'high' | 'critical'; // Added 'critical'
  location: string;
  created_at: string;
  updated_at: string;
  assigned_officer?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical'; // Added severity for crime reports
}

export interface DashboardStats {
  total_alerts: number;
  active_alerts: number;
  total_reports: number;
  open_reports: number;
  resolved_today: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to transform Supabase User to AuthUser
const transformUserToAuthUser = (user: User): AuthUser => {
  // Check user status based on available properties
  let status: UserStatus = 'active'; // Default to active
  
  // You might need to adjust this based on your actual user status tracking
  // This is a simplified version - adjust according to your auth setup
  if (!user.email_confirmed_at) {
    status = 'pending';
  }
  // Add other status checks as needed

  return {
    id: user.id,
    email: user.email || '',
    user_metadata: user.user_metadata || {},
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at, // Fallback to created_at if updated_at is undefined
    last_sign_in_at: user.last_sign_in_at || null,
    role: (user.user_metadata?.role as UserRole) || 'user',
    status: status
  };
};

// Auth API methods
export const authAPI = {
  // Get all users (admin only)
  getAllUsers: async (): Promise<AuthUser[]> => {
    try {
      // Get current user to verify admin status
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      // Use API route to get users
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const users = await response.json();
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Fallback: Try direct Supabase call as backup
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const fallbackUser: AuthUser = transformUserToAuthUser(currentUser);
          return [fallbackUser];
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      throw error;
    }
  },

  // Create new user
  createUser: async (userData: CreateUserData): Promise<AuthUser> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const newUser = await response.json();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user role
  updateUserRole: async (userId: string, role: UserRole): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId,
          updates: { role }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }

      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId: string, status: UserStatus): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId,
          updates: { status }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user status');
      }

      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  // Update user data (multiple fields)
  updateUser: async (userId: string, updates: Partial<UpdateUserData>): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId,
          updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Delete user (suspend)
  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<AuthUser | null> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      const user = await response.json();
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  // Bulk update users
  bulkUpdateUsers: async (userIds: string[], updates: Partial<UpdateUserData>): Promise<boolean> => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required');
      }

      // Check if current user is admin
      const userRole = currentUser.user_metadata?.role;
      if (userRole !== 'admin') {
        throw new Error('Admin access required');
      }

      const response = await fetch('/api/admin/users/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userIds,
          updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bulk update users');
      }

      return true;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw error;
    }
  }
};

// Reports API (for ControlRoomDashboard)
export const reportsAPI = {
  // Get all reports
  getReports: async (): Promise<any[]> => {
    try {
      // Implementation for getting reports
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting reports:', error);
      throw error;
    }
  },

  // Create report
  createReport: async (reportData: any): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },

  // Update report
  updateReport: async (reportId: string, updates: any): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  },

  // Get vehicle alerts
  getVehicleAlerts: async (): Promise<VehicleAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting vehicle alerts:', error);
      throw error;
    }
  },

  // Get crime reports
  getCrimeReports: async (): Promise<CrimeReport[]> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting crime reports:', error);
      throw error;
    }
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      // This would typically aggregate data from multiple tables
      // For now, returning mock data - implement based on your actual database structure
      const { data: alerts } = await supabase
        .from('vehicle_alerts')
        .select('id, status');
      
      const { data: reports } = await supabase
        .from('crime_reports')
        .select('id, status, created_at');
      
      const totalAlerts = alerts?.length || 0;
      const activeAlerts = alerts?.filter(a => a.status === 'active').length || 0;
      const totalReports = reports?.length || 0;
      const openReports = reports?.filter(r => r.status === 'open').length || 0;
      
      // Calculate resolved today (mock implementation)
      const today = new Date().toISOString().split('T')[0];
      const resolvedToday = reports?.filter(r => 
        (r.status === 'closed' || r.status === 'resolved') && r.created_at.startsWith(today)
      ).length || 0;

      return {
        total_alerts: totalAlerts,
        active_alerts: activeAlerts,
        total_reports: totalReports,
        open_reports: openReports,
        resolved_today: resolvedToday
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      // Return default stats on error
      return {
        total_alerts: 0,
        active_alerts: 0,
        total_reports: 0,
        open_reports: 0,
        resolved_today: 0
      };
    }
  },

  // Update vehicle alert
  updateVehicleAlert: async (alertId: string, updates: Partial<VehicleAlert>): Promise<VehicleAlert> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .update(updates)
        .eq('id', alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating vehicle alert:', error);
      throw error;
    }
  },

  // Update crime report
  updateCrimeReport: async (reportId: string, updates: Partial<CrimeReport>): Promise<CrimeReport> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating crime report:', error);
      throw error;
    }
  }
};

// Helper functions
export const authHelpers = {
  // Check if current user is admin
  isAdmin: async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.role === 'admin';
  },

  // Check if current user has specific role
  hasRole: async (role: UserRole): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.role === role;
  },

  // Get current user with full data
  getCurrentUser: async (): Promise<AuthUser | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return transformUserToAuthUser(user);
  },

  // Ensure user has admin access
  requireAdmin: async (): Promise<void> => {
    const isAdmin = await authHelpers.isAdmin();
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
  }
};

export default supabase;