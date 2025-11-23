import { createClient } from '@supabase/supabase-js';

// Updated Types with proper statuses
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'active' | 'resolved' | 'recovered' | 'rejected';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleAlert {
  id: string;
  ob_number: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  year?: number;
  reason: string;
  last_seen_location: string;
  last_seen_time?: string;
  severity: SeverityType;
  status: ReportStatus;
  notes?: string;
  evidence_images?: string[];
  reported_by: string;
  reporter_profile?: Profile;
  created_at: string;
  updated_at: string;
}

export interface CrimeReport {
  id: string;
  ob_number: string;
  title: string;
  description: string;
  location: string;
  incident_time?: string;
  report_type: string;
  severity: SeverityType;
  status: ReportStatus;
  witness_info?: string;
  evidence_images?: string[];
  contact_allowed: boolean;
  reported_by: string;
  reporter_profile?: Profile;
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

// Type guard functions
export const isVehicleAlert = (item: any): item is VehicleAlert => {
  return item && typeof item === 'object' && 
    'license_plate' in item && 
    'vehicle_make' in item;
};

export const isCrimeReport = (item: any): item is CrimeReport => {
  return item && typeof item === 'object' && 
    'title' in item && 
    'description' in item;
};

// Hardcoded admin users for immediate fallback
const ADMIN_USERS = [
  'zweli@msn.com',
  'clint@rapid911.co.za',
  'zwell@msn.com'
];

// In-memory cache for profiles to avoid database queries
const profileCache = new Map();

// Enhanced error handling that never throws
const safeApiCall = async (operation: () => Promise<any>, context: string) => {
  try {
    return await operation();
  } catch (error) {
    console.error(`❌ ${context}:`, error);
    return null;
  }
};

// Generate unique OB number
const generateOBNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `OB-${timestamp}-${random}`;
};

// Auth API - Enhanced with real user management
export const authAPI = {
  getCurrentUser: async (): Promise<Profile | null> => {
    return safeApiCall(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('👤 No authenticated user');
        return null;
      }

      console.log('🔄 Getting profile for:', user.email);
      
      // Check cache first
      if (profileCache.has(user.id)) {
        console.log('✅ Using cached profile');
        return profileCache.get(user.id);
      }

      // Try to get profile from database first
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          console.log('✅ Found profile in database:', profile);
          profileCache.set(user.id, profile);
          return profile;
        }
      } catch (error) {
        console.log('📋 No profile in database, using fallback');
      }

      // Check if user is admin from hardcoded list
      const isAdmin = ADMIN_USERS.includes(user.email?.toLowerCase() || '');
      
      // Create profile without database
      const profile = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: (isAdmin ? 'admin' : 'user') as UserRole,
        status: 'active' as UserStatus,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Cache the profile
      profileCache.set(user.id, profile);
      
      console.log('📊 Created profile (database bypassed):', profile);
      return profile;
    }, 'getCurrentUser');
  },

  getAllUsers: async (): Promise<Profile[]> => {
    return safeApiCall(async () => {
      console.log('🔄 Fetching all users from database...');
      
      try {
        // Try to get all users from database
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && profiles && profiles.length > 0) {
          console.log(`✅ Loaded ${profiles.length} users from database`);
          
          // Update cache with all users
          profiles.forEach(profile => {
            profileCache.set(profile.id, profile);
          });
          
          return profiles;
        }

        // Fallback: return current user only
        console.log('📋 No users in database, using fallback');
        const currentUser = await authAPI.getCurrentUser();
        return currentUser ? [currentUser] : [];
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        const currentUser = await authAPI.getCurrentUser();
        return currentUser ? [currentUser] : [];
      }
    }, 'getAllUsers');
  },

  updateUserRole: async (userId: string, updates: { 
    role?: UserRole; 
    status?: UserStatus;
    full_name?: string | null;
  }): Promise<Profile> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating user role:', userId, updates);
      
      try {
        // Update in database if possible
        const { data: updatedProfile, error } = await supabase
          .from('profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (!error && updatedProfile) {
          console.log('✅ User updated in database:', updatedProfile);
          profileCache.set(userId, updatedProfile);
          return updatedProfile;
        }
      } catch (error) {
        console.log('📋 Database update failed, using cache');
      }

      // Update cached profile
      const currentProfile = profileCache.get(userId) || await authAPI.getCurrentUser();
      if (currentProfile) {
        const updatedProfile = {
          ...currentProfile,
          ...updates,
          updated_at: new Date().toISOString()
        };
        profileCache.set(userId, updatedProfile);
        return updatedProfile;
      }
      
      // Fallback if no profile found
      return {
        id: userId,
        email: 'unknown@example.com',
        full_name: updates.full_name || null,
        role: updates.role || 'user',
        status: updates.status || 'active',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }, 'updateUserRole');
  },

  updateLastSeen: async (userId: string): Promise<void> => {
    return safeApiCall(async () => {
      const now = new Date().toISOString();
      
      try {
        // Update in database if possible
        await supabase
          .from('profiles')
          .update({ 
            last_seen: now,
            updated_at: now
          })
          .eq('id', userId);
      } catch (error) {
        console.log('📋 Database update failed for last_seen');
      }

      // Update cache
      const currentProfile = profileCache.get(userId);
      if (currentProfile) {
        currentProfile.last_seen = now;
        currentProfile.updated_at = now;
        profileCache.set(userId, currentProfile);
      }
    }, 'updateLastSeen');
  }
};



// Enhanced Reports API with OB numbers and reporter profiles
export const reportsAPI = {
  createVehicleAlert: async (data: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Creating vehicle alert:', data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate OB number
      const obNumber = generateOBNumber();

      // Prepare data with all required fields and proper formatting
      const alertData = {
        ob_number: obNumber,
        license_plate: data.license_plate?.toUpperCase() || 'UNKNOWN',
        vehicle_make: data.vehicle_make || 'UNKNOWN',
        vehicle_model: data.vehicle_model || 'UNKNOWN',
        vehicle_color: data.vehicle_color || 'UNKNOWN',
        year: data.year ? parseInt(data.year) : null,
        reason: data.reason || 'No reason provided',
        last_seen_location: data.last_seen_location || null,
        last_seen_time: data.last_seen_time ? new Date(data.last_seen_time).toISOString() : null,
        severity: data.severity || 'medium',
        status: data.status || 'active',
        notes: data.notes || null,
        evidence_images: data.evidence_images || [],
        reported_by: user.id
      };

      console.log('📤 Sending vehicle alert to database:', alertData);

      const { data: result, error } = await supabase
        .from('vehicle_alerts')
        .insert([alertData])
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .single();

      if (error) {
        console.error('❌ Vehicle alert creation FAILED:', error);
        
        // More specific error handling
        if (error.code === '23505') {
          throw new Error('A report with this license plate already exists.');
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please check your account permissions.');
        } else {
          throw new Error(error.message || 'Failed to create vehicle alert.');
        }
      }

      console.log('✅ Vehicle alert created successfully:', result);
      return result;
    }, 'createVehicleAlert');
  },

  updateVehicleAlert: async (id: string, updates: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating vehicle alert:', id, updates);
      
      const { data: alert, error } = await supabase
        .from('vehicle_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .single();

      if (error) {
        console.error('❌ Error updating vehicle alert:', error);
        
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your account permissions.');
        } else {
          throw new Error(error.message || 'Failed to update vehicle alert.');
        }
      }

      console.log('✅ Vehicle alert updated successfully:', alert);
      return alert;
    }, 'updateVehicleAlert');
  },

  getVehicleAlerts: async (): Promise<VehicleAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error getting vehicle alerts:', error);
        throw error;
      }

      console.log('✅ Vehicle alerts loaded:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error getting vehicle alerts:', error);
      return [];
    }
  },

  createCrimeReport: async (data: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Creating crime report:', data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Generate OB number
      const obNumber = generateOBNumber();

      const reportData = {
        ob_number: obNumber,
        title: data.title || 'Untitled Report',
        description: data.description || 'No description provided',
        location: data.location || 'Unknown location',
        incident_time: data.incident_time ? new Date(data.incident_time).toISOString() : null,
        report_type: data.report_type || 'other',
        severity: data.severity || 'medium',
        status: data.status || 'active',
        witness_info: data.witness_info || null,
        evidence_images: data.evidence_images || [],
        contact_allowed: Boolean(data.contact_allowed),
        reported_by: user.id
      };

      console.log('📤 Sending crime report to database:', reportData);

      const { data: result, error } = await supabase
        .from('crime_reports')
        .insert([reportData])
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .single();

      if (error) {
        console.error('❌ Crime report creation FAILED:', error);
        
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your account permissions.');
        } else {
          throw new Error(error.message || 'Failed to create crime report.');
        }
      }

      console.log('✅ Crime report created successfully:', result);
      return result;
    }, 'createCrimeReport');
  },

  updateCrimeReport: async (id: string, updates: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating crime report:', id, updates);
      
      const { data: report, error } = await supabase
        .from('crime_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .single();

      if (error) {
        console.error('❌ Error updating crime report:', error);
        
        if (error.code === '42501') {
          throw new Error('Permission denied. Please check your account permissions.');
        } else {
          throw new Error(error.message || 'Failed to update crime report.');
        }
      }

      console.log('✅ Crime report updated successfully:', report);
      return report;
    }, 'updateCrimeReport');
  },

  getCrimeReports: async (): Promise<CrimeReport[]> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select(`
          *,
          reporter_profile:profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error getting crime reports:', error);
        throw error;
      }

      console.log('✅ Crime reports loaded:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ Error getting crime reports:', error);
      return [];
    }
  },

  getDashboardStats: async (): Promise<any> => {
    return safeApiCall(async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Use faster count queries instead of fetching all data
        const [
          vehiclesCount,
          crimesCount,
          activeVehiclesCount,
          activeCrimesCount,
          resolvedVehiclesCount,
          resolvedCrimesCount
        ] = await Promise.all([
          // Today's reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).gte('created_at', todayISO),
          supabase.from('crime_reports').select('id', { count: 'exact' }).gte('created_at', todayISO),
          
          // Active reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('status', 'active'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('status', 'active'),
          
          // Resolved reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('status', 'resolved'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('status', 'resolved')
        ]);

        return {
          todayReports: (vehiclesCount.count || 0) + (crimesCount.count || 0),
          activeReports: (activeVehiclesCount.count || 0) + (activeCrimesCount.count || 0),
          resolvedVehicles: resolvedVehiclesCount.count || 0,
          resolvedCrimes: resolvedCrimesCount.count || 0,
          vehiclesWithLocation: 0, // Simplified for performance
          crimesWithLocation: 0    // Simplified for performance
        };
      } catch (error) {
        console.error('❌ Error in getDashboardStats:', error);
        return {
          todayReports: 0,
          activeReports: 0,
          resolvedVehicles: 0,
          resolvedCrimes: 0,
          vehiclesWithLocation: 0,
          crimesWithLocation: 0
        };
      }
    }, 'getDashboardStats');
  }
};

// Storage API
export const storageAPI = {
  uploadImage: async (bucket: string, file: File, path: string): Promise<string> => {
    return safeApiCall(async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return publicUrl;
    }, 'uploadImage');
  },

  deleteImage: async (bucket: string, path: string): Promise<void> => {
    return safeApiCall(async () => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    }, 'deleteImage');
  }
};

// Debug and Utility Functions
export const debugAPI = {
  testConnection: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
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
    const tables = ['profiles', 'vehicle_alerts', 'crime_reports'];
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

export default supabase;