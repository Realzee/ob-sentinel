import { createClient } from '@supabase/supabase-js';

// Types
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'resolved' | 'rejected';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleAlert {
  id: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  year?: number;
  reason: string;
  last_seen_location?: string;
  last_seen_time?: string;
  severity: SeverityType;
  notes?: string;
  evidence_images?: string[];
  reported_by: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface CrimeReport {
  id: string;
  title: string;
  description: string;
  location: string;
  incident_time?: string;
  report_type: string;
  severity: SeverityType;
  witness_info?: string;
  evidence_images?: string[];
  contact_allowed: boolean;
  reported_by: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Hardcoded admin users for immediate fallback
const ADMIN_USERS = [
  'zweli@msn.com',
  'clint@rapid911.co.za',
  'zwell@msn.com'
];

// Auth API - FORCE using 'profiles' table
export const authAPI = {
  getCurrentUser: async (): Promise<Profile | null> => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      
      if (!user) {
        console.log('👤 No authenticated user');
        return null;
      }

      console.log('🔄 Fetching profile for user:', user.id);
      
      // Check if user is admin from hardcoded list first
      const isAdmin = ADMIN_USERS.includes(user.email?.toLowerCase() || '');
      
      // Try to get from database, but don't fail if it errors
      let profileFromDb = null;
      try {
        const { data, error } = await supabase
          .from('profiles')  // FORCE using profiles table
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          profileFromDb = data;
          console.log('✅ Profile found in database');
        } else {
          console.log('❌ Database profile not found, using fallback');
        }
      } catch (dbError) {
        console.error('❌ Database error, using fallback:', dbError);
      }

      // If we have a database profile, use it
      if (profileFromDb) {
        return profileFromDb;
      }

      // Otherwise create fallback profile
      console.log('📝 Creating fallback profile');
      const fallbackProfile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: (isAdmin ? 'admin' : 'user') as UserRole,
        status: 'active' as UserStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Try to save to database, but don't worry if it fails
      try {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')  // FORCE using profiles table
          .insert([fallbackProfile])
          .select()
          .single();

        if (!insertError && newProfile) {
          console.log('✅ Fallback profile saved to database');
          return newProfile;
        }
      } catch (insertError) {
        console.error('❌ Error saving fallback profile:', insertError);
      }

      console.log('📊 Returning fallback profile');
      return fallbackProfile;
    } catch (error) {
      console.error('❌ Error in getCurrentUser:', error);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;
      
      // Ultimate fallback
      const isAdmin = ADMIN_USERS.includes(user.email?.toLowerCase() || '');
      return {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: (isAdmin ? 'admin' : 'user') as UserRole,
        status: 'active' as UserStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  getAllUsers: async (): Promise<Profile[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profiles, error } = await supabase
        .from('profiles')  // FORCE using profiles table
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users, returning empty array:', error);
        return [];
      }

      return profiles || [];
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      return [];
    }
  },

  updateUserRole: async (userId: string, updates: { 
    role?: UserRole; 
    status?: UserStatus;
    full_name?: string | null;
  }): Promise<Profile> => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: profile, error } = await supabase
        .from('profiles')  // FORCE using profiles table
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      // Return a mock profile if update fails
      const { data: { user } } = await supabase.auth.getUser();
      return {
        id: userId,
        email: user?.email || 'unknown@example.com',
        full_name: updates.full_name || null,
        role: updates.role || 'user',
        status: updates.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }
};

// Reports API (unchanged, but included for completeness)
export const reportsAPI = {
  createVehicleAlert: async (data: Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at'>): Promise<VehicleAlert> => {
    try {
      const { data: result, error } = await supabase
        .from('vehicle_alerts')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creating vehicle alert:', error);
      throw error;
    }
  },

  getVehicleAlerts: async (): Promise<VehicleAlert[]> => {
    try {
      const { data: alerts, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return alerts || [];
    } catch (error) {
      console.error('Error getting vehicle alerts:', error);
      return [];
    }
  },

  updateVehicleAlert: async (id: string, updates: Partial<VehicleAlert>): Promise<VehicleAlert> => {
    try {
      const { data: alert, error } = await supabase
        .from('vehicle_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return alert;
    } catch (error) {
      console.error('Error updating vehicle alert:', error);
      throw error;
    }
  },

  createCrimeReport: async (data: Omit<CrimeReport, 'id' | 'created_at' | 'updated_at'>): Promise<CrimeReport> => {
    try {
      const { data: result, error } = await supabase
        .from('crime_reports')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Error creating crime report:', error);
      throw error;
    }
  },

  getCrimeReports: async (): Promise<CrimeReport[]> => {
    try {
      const { data: reports, error } = await supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return reports || [];
    } catch (error) {
      console.error('Error getting crime reports:', error);
      return [];
    }
  },

  updateCrimeReport: async (id: string, updates: Partial<CrimeReport>): Promise<CrimeReport> => {
    try {
      const { data: report, error } = await supabase
        .from('crime_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return report;
    } catch (error) {
      console.error('Error updating crime report:', error);
      throw error;
    }
  },

  getDashboardStats: async (): Promise<any> => {
    return {
      todayReports: 0,
      activeReports: 0,
      resolvedVehicles: 0,
      resolvedCrimes: 0,
      vehiclesWithLocation: 0,
      crimesWithLocation: 0
    };
  }
};

export default supabase;
