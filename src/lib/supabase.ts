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

// Enhanced error handling
const handleApiError = (error: any, context: string) => {
  console.error(`❌ ${context}:`, error);
  
  // Map common Supabase errors to user-friendly messages
  if (error?.code === 'PGRST301') {
    throw new Error('Database table does not exist. Please check your database schema.');
  }
  
  if (error?.code === '42501') {
    throw new Error('Permission denied. Check Row Level Security policies.');
  }
  
  if (error?.code === '23505') {
    throw new Error('This record already exists.');
  }
  
  if (error?.code === 'PGRST116') {
    throw new Error('Record not found.');
  }
  
  if (error?.message?.includes('JWT')) {
    throw new Error('Authentication error. Please sign in again.');
  }
  
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    throw new Error('Network error. Please check your connection.');
  }
  
  throw new Error(error?.message || `Error in ${context}`);
};

// Auth API
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
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          console.log('📝 Creating default profile for user');
          const defaultProfile = {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: 'user' as UserRole,
            status: 'active' as UserStatus
          };
          
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert([defaultProfile])
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating profile:', createError);
            // Return basic profile if creation fails
            return {
              ...defaultProfile,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }

          return newProfile;
        }
        
        console.error('❌ Error fetching profile:', error);
        // Return basic profile if fetch fails
        return {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'user' as UserRole,
          status: 'active' as UserStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return profile;
    } catch (error) {
      console.error('❌ Error in getCurrentUser:', error);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Return basic profile as fallback
      return user ? {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'user' as UserRole,
        status: 'active' as UserStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null;
    }
  },

  getAllUsers: async (): Promise<Profile[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return handleApiError(error, 'Error fetching users');
      }

      return profiles || [];
    } catch (error) {
      return handleApiError(error, 'Error fetching users');
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
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error updating user role');
      }

      return profile;
    } catch (error) {
      return handleApiError(error, 'Error updating user role');
    }
  },

  createUserProfile: async (userId: string, email: string, data: {
    full_name?: string;
    role?: UserRole;
  }): Promise<Profile> => {
    try {
      const profileData = {
        id: userId,
        email,
        full_name: data.full_name || email.split('@')[0],
        role: data.role || 'user',
        status: 'active' as UserStatus
      };

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error creating user profile');
      }

      return profile;
    } catch (error) {
      return handleApiError(error, 'Error creating user profile');
    }
  }
};

// Reports API
export const reportsAPI = {
  // Vehicle Alerts
  createVehicleAlert: async (data: Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at'>): Promise<VehicleAlert> => {
    try {
      console.log('🔄 Creating vehicle alert:', data);
      
      const { data: result, error } = await supabase
        .from('vehicle_alerts')
        .insert([data])
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error creating vehicle alert');
      }

      console.log('✅ Vehicle alert created:', result);
      return result;
    } catch (error) {
      return handleApiError(error, 'Error creating vehicle alert');
    }
  },

  getVehicleAlerts: async (): Promise<VehicleAlert[]> => {
    try {
      const { data: alerts, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return handleApiError(error, 'Error getting vehicle alerts');
      }

      return alerts || [];
    } catch (error) {
      return handleApiError(error, 'Error getting vehicle alerts');
    }
  },

  updateVehicleAlert: async (id: string, updates: Partial<VehicleAlert>): Promise<VehicleAlert> => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: alert, error } = await supabase
        .from('vehicle_alerts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error updating vehicle alert');
      }

      return alert;
    } catch (error) {
      return handleApiError(error, 'Error updating vehicle alert');
    }
  },

  // Crime Reports
  createCrimeReport: async (data: Omit<CrimeReport, 'id' | 'created_at' | 'updated_at'>): Promise<CrimeReport> => {
    try {
      console.log('🔄 Creating crime report:', data);
      
      const { data: result, error } = await supabase
        .from('crime_reports')
        .insert([data])
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error creating crime report');
      }

      console.log('✅ Crime report created:', result);
      return result;
    } catch (error) {
      return handleApiError(error, 'Error creating crime report');
    }
  },

  getCrimeReports: async (): Promise<CrimeReport[]> => {
    try {
      const { data: reports, error } = await supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return handleApiError(error, 'Error getting crime reports');
      }

      return reports || [];
    } catch (error) {
      return handleApiError(error, 'Error getting crime reports');
    }
  },

  updateCrimeReport: async (id: string, updates: Partial<CrimeReport>): Promise<CrimeReport> => {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: report, error } = await supabase
        .from('crime_reports')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return handleApiError(error, 'Error updating crime report');
      }

      return report;
    } catch (error) {
      return handleApiError(error, 'Error updating crime report');
    }
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<any> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get today's vehicle reports
      const { data: todayVehicles, error: vehiclesError } = await supabase
        .from('vehicle_alerts')
        .select('id')
        .gte('created_at', todayISO);

      // Get today's crime reports
      const { data: todayCrimes, error: crimesError } = await supabase
        .from('crime_reports')
        .select('id')
        .gte('created_at', todayISO);

      // Get active reports (pending status)
      const { data: activeVehicles, error: activeVehiclesError } = await supabase
        .from('vehicle_alerts')
        .select('id')
        .eq('status', 'pending');

      const { data: activeCrimes, error: activeCrimesError } = await supabase
        .from('crime_reports')
        .select('id')
        .eq('status', 'pending');

      // Get resolved reports
      const { data: resolvedVehicles, error: resolvedVehiclesError } = await supabase
        .from('vehicle_alerts')
        .select('id')
        .eq('status', 'resolved');

      const { data: resolvedCrimes, error: resolvedCrimesError } = await supabase
        .from('crime_reports')
        .select('id')
        .eq('status', 'resolved');

      // Get reports with location
      const { data: vehiclesWithLocation, error: vehiclesLocationError } = await supabase
        .from('vehicle_alerts')
        .select('id')
        .not('last_seen_location', 'is', null);

      const { data: crimesWithLocation, error: crimesLocationError } = await supabase
        .from('crime_reports')
        .select('id')
        .not('location', 'is', null);

      // Check for any errors
      const errors = [
        vehiclesError, crimesError, activeVehiclesError, activeCrimesError,
        resolvedVehiclesError, resolvedCrimesError, vehiclesLocationError, crimesLocationError
      ].filter(error => error);

      if (errors.length > 0) {
        console.error('❌ Errors in getDashboardStats:', errors);
      }

      return {
        todayReports: (todayVehicles?.length || 0) + (todayCrimes?.length || 0),
        activeReports: (activeVehicles?.length || 0) + (activeCrimes?.length || 0),
        resolvedVehicles: resolvedVehicles?.length || 0,
        resolvedCrimes: resolvedCrimes?.length || 0,
        vehiclesWithLocation: vehiclesWithLocation?.length || 0,
        crimesWithLocation: crimesWithLocation?.length || 0
      };
    } catch (error) {
      console.error('❌ Error in getDashboardStats:', error);
      // Return default stats if there's an error
      return {
        todayReports: 0,
        activeReports: 0,
        resolvedVehicles: 0,
        resolvedCrimes: 0,
        vehiclesWithLocation: 0,
        crimesWithLocation: 0
      };
    }
  }
};

// Storage API
export const storageAPI = {
  uploadImage: async (bucket: string, file: File, path: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) {
        return handleApiError(error, 'Error uploading image');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return publicUrl;
    } catch (error) {
      return handleApiError(error, 'Error uploading image');
    }
  },

  deleteImage: async (bucket: string, path: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        return handleApiError(error, 'Error deleting image');
      }
    } catch (error) {
      return handleApiError(error, 'Error deleting image');
    }
  }
};

// Debug and Utility Functions
export const debugAPI = {
  testConnection: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      if (error) {
        console.error('❌ Database connection error:', error);
        return false;
      }
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  },

  checkTables: async (): Promise<{ [key: string]: boolean }> => {
    const tables = ['user_profiles', 'vehicle_alerts', 'crime_reports'];
    const results: { [key: string]: boolean } = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        results[table] = !error;
      } catch (error) {
        results[table] = false;
      }
    }

    console.log('📊 Table check results:', results);
    return results;
  },

  clearAuth: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      }
      console.log('✅ Auth cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
    }
  }
};

// Export default for convenience
export default supabase;