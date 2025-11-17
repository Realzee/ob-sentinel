import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// User role types
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'rejected';

// Profile interface
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
  status: UserStatus;
  department: string | null;
  badge_number: string | null;
  created_at: string;
  updated_at: string;
}

// Vehicle Alert interface
export interface VehicleAlert {
  id: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  year: number | null;
  reason: string;
  last_seen_location: string;
  last_seen_time: string | null;
  reported_by: string;
  status: ReportStatus;
  severity: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// Crime Report interface
export interface CrimeReport {
  id: string;
  title: string;
  description: string;
  location: string;
  incident_time: string | null;
  report_type: string;
  reported_by: string;
  status: ReportStatus;
  severity: string;
  evidence_images: string[];
  witness_info: string | null;
  contact_allowed: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// Enhanced user functions
export const authAPI = {
  // Get current user with profile
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { ...user, profile };
  },

  // Check if user has specific role
  async hasRole(requiredRole: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.profile?.role === requiredRole;
  },

  // Check if user has at least one of the required roles
  async hasAnyRole(requiredRoles: UserRole[]): Promise<boolean> {
    const user = await this.getCurrentUser();
    return requiredRoles.includes(user?.profile?.role);
  },

  // Get all users (admin only)
  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update user role and status
  async updateUserRole(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return data;
  },

  // Get user profile by ID
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Ensure user exists in profiles table (for auth callbacks)
  async ensureUserExists(userId: string, email: string) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            email: email,
            role: 'user',
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }
      return newProfile;
    }
    return existingProfile;
  },

  // Ensure user profile is complete
  async ensureUserProfile(userId: string, updates: Partial<Profile>) {
  // Map 'name' to 'full_name' if provided for backward compatibility
  const profileUpdates = { ...updates };
  if ('name' in profileUpdates) {
    profileUpdates.full_name = (profileUpdates as any).name;
    delete (profileUpdates as any).name;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  return data;
},

  // Get user profile safely (handles errors)
  async getSafeUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in getSafeUserProfile:', error);
      return null;
    }
  }
};

// Report functions
export const reportsAPI = {
  // Vehicle alerts
  async getVehicleAlerts() {
    const { data, error } = await supabase
      .from('alerts_vehicles')
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createVehicleAlert(alertData: Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at' | 'profiles'>) {
    const { data, error } = await supabase
      .from('alerts_vehicles')
      .insert([alertData])
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateVehicleAlert(id: string, updates: Partial<VehicleAlert>) {
    const { data, error } = await supabase
      .from('alerts_vehicles')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Crime reports
  async getCrimeReports() {
    const { data, error } = await supabase
      .from('crime_reports')
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createCrimeReport(reportData: Omit<CrimeReport, 'id' | 'created_at' | 'updated_at' | 'profiles'>) {
    const { data, error } = await supabase
      .from('crime_reports')
      .insert([reportData])
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateCrimeReport(id: string, updates: Partial<CrimeReport>) {
    const { data, error } = await supabase
      .from('crime_reports')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        profiles:reported_by(full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Dashboard statistics
  async getDashboardStats() {
    const [vehicles, crimes] = await Promise.all([
      supabase.from('alerts_vehicles').select('status, severity', { count: 'exact' }),
      supabase.from('crime_reports').select('status, severity', { count: 'exact' })
    ]);

    return {
      vehicleAlerts: {
        total: vehicles.count || 0,
        byStatus: vehicles.data?.reduce((acc: any, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {}),
        bySeverity: vehicles.data?.reduce((acc: any, item) => {
          acc[item.severity] = (acc[item.severity] || 0) + 1;
          return acc;
        }, {})
      },
      crimeReports: {
        total: crimes.count || 0,
        byStatus: crimes.data?.reduce((acc: any, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {}),
        bySeverity: crimes.data?.reduce((acc: any, item) => {
          acc[item.severity] = (acc[item.severity] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
};

// Dispatch functions
export const dispatchAPI = {
  async createDispatchLog(logData: any) {
    const { data, error } = await supabase
      .from('dispatch_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDispatchLogs() {
    const { data, error } = await supabase
      .from('dispatch_logs')
      .select(`
        *,
        profiles:assigned_to(full_name, badge_number)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};

// Export individual functions for backward compatibility
export const ensureUserExists = authAPI.ensureUserExists;
export const ensureUserProfile = authAPI.ensureUserProfile;
export const getSafeUserProfile = authAPI.getSafeUserProfile;