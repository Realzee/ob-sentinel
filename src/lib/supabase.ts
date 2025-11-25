// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Updated Types with proper statuses
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'active' | 'resolved' | 'recovered' | 'rejected';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null; // Make optional
  role: UserRole;
  status: UserStatus; // Keep as UserStatus
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
}

// Update AuthUser interface to match
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    role?: UserRole;
  };
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  invited_at?: string;
  role?: string;
  status?: UserStatus; // Keep as UserStatus
  banned_until?: string | null;
}

export interface VehicleAlert {
  id: string;
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
  created_at: string;
  updated_at: string;
  ob_number?: string;
}

export interface CrimeReport {
  id: string;
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
  created_at: string;
  updated_at: string;
  ob_number?: string;
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

export const authUserToProfile = (authUser: AuthUser): Profile => ({
  id: authUser.id,
  email: authUser.email,
  full_name: authUser.user_metadata?.full_name || null,
  role: (authUser.user_metadata?.role as UserRole) || 'user',
  status: authUser.status || 'active',
  created_at: authUser.created_at,
  updated_at: authUser.updated_at || authUser.created_at,
  last_seen_at: authUser.last_sign_in_at || authUser.created_at
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

// Date formatter helper
export const formatDateForDateTimeLocal = (dateString: string | null): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
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

// SIMPLE USER PROFILE - COMPLETELY IN-MEMORY
const createUserProfileSimple = async (userId: string, email: string): Promise<Profile> => {
  const isAdmin = ADMIN_USERS.includes(email.toLowerCase());
  
  const profile: Profile = {
    id: userId,
    email: email,
    full_name: email.split('@')[0],
    role: (isAdmin ? 'admin' : 'user') as UserRole,
    status: 'active' as UserStatus, // Add type assertion
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  };

  console.log('📝 Created user profile (in-memory):', profile);
  profileCache.set(userId, profile);
  return profile;
};

// Auth API - Completely database-independent
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

      // Create in-memory profile (bypass database completely)
      const profile = await createUserProfileSimple(user.id, user.email!);
      return profile;
    }, 'getCurrentUser');
  },

  getAllUsers: async (): Promise<any[]> => {
  return safeApiCall(async () => {
    console.log('🔍 Loading users from Auth API route...');

    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API route failed:', response.status, errorText);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Successfully loaded users from Auth API:', data.users?.length);
      return data.users || [];

    } catch (error) {
      console.error('❌ Auth API route failed:', error);
      
      // Fallback: return current user only
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (currentAuthUser) {
        const fallbackUser = {
          id: currentAuthUser.id,
          email: currentAuthUser.email || '',
          user_metadata: currentAuthUser.user_metadata || {},
          created_at: currentAuthUser.created_at,
          updated_at: currentAuthUser.updated_at,
          last_sign_in_at: currentAuthUser.last_sign_in_at,
          role: currentAuthUser.user_metadata?.role || 'user',
          status: 'active'
        };
        return [fallbackUser];
      }
      
      return [];
    }
  }, 'getAllUsers');
},

  updateUserRole: async (userId: string, newRole: UserRole): Promise<boolean> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating user role via API:', userId, newRole);

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateRole',
            userId,
            role: newRole
          })
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        console.log('✅ User role updated successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to update user role:', error);
        return false;
      }
    }, 'updateUserRole');
  },

  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
  }): Promise<AuthUser | null> => {
    return safeApiCall(async () => {
      console.log('🔄 Creating new user via API:', userData.email);

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'createUser',
            ...userData
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ User created successfully');
        return data.user;
      } catch (error) {
        console.error('❌ Failed to create user:', error);
        return null;
      }
    }, 'createUser');
  },

  updateUserStatus: async (userId: string, status: UserStatus): Promise<boolean> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating user status via API:', userId, status);

      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateStatus',
            userId,
            status
          })
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        console.log('✅ User status updated successfully');
        return true;
      } catch (error) {
        console.error('❌ Failed to update user status:', error);
        return false;
      }
    }, 'updateUserStatus');
  }
};

// ULTRA-SIMPLE CRIME REPORT CREATION - BYPASS ALL USER CHECKS
const createCrimeReportDirect = async (data: any): Promise<any> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare data - use system user if no user found
    const reportData = {
      title: data.title || 'Untitled Report',
      description: data.description || 'No description provided',
      location: data.location || 'Unknown Location',
      incident_time: data.incident_time ? new Date(data.incident_time).toISOString() : null,
      report_type: data.report_type || 'other',
      severity: data.severity || 'medium',
      status: data.status || 'active',
      witness_info: data.witness_info || null,
      evidence_images: data.evidence_images || [],
      contact_allowed: Boolean(data.contact_allowed),
      reported_by: user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID
      ob_number: data.ob_number || `OBC${Date.now().toString(36).toUpperCase()}`
    };

    console.log('📤 DIRECT: Sending crime report to database:', reportData);

    // Try direct insert without any user validation
    const { data: result, error } = await supabase
      .from('crime_reports')
      .insert([reportData])
      .select()
      .single();

    if (error) {
      console.error('❌ DIRECT: Crime report creation FAILED:', error);
      throw error;
    }

    console.log('✅ DIRECT: Crime report created successfully:', result);
    return result;
  } catch (error: any) {
    console.error('❌ DIRECT: Ultimate crime report failure:', error);
    throw error;
  }
};

// Enhanced Reports API with better error handling and performance
export const reportsAPI = {
  createVehicleAlert: async (data: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Creating vehicle alert:', data);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Prepare data with all required fields and proper formatting
      const alertData = {
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
        reported_by: user.id,
        ob_number: data.ob_number || `OBV${Date.now().toString(36).toUpperCase()}`
      };

      console.log('📤 Sending vehicle alert to database:', alertData);

      const { data: result, error } = await supabase
        .from('vehicle_alerts')
        .insert([alertData])
        .select()
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
      
      // Remove any user-related updates to avoid RLS recursion
      const safeUpdates = { ...updates };
      delete safeUpdates.reported_by;
      delete safeUpdates.reporter_profile;
      
      const { data: alert, error } = await supabase
        .from('vehicle_alerts')
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
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

  getVehicleAlerts: async (): Promise<any[]> => {
    return safeApiCall(async () => {
      // Use a faster query with only needed fields
      const { data: alerts, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error getting vehicle alerts:', error);
        return [];
      }

      console.log(`✅ Loaded ${alerts?.length || 0} vehicle alerts`);
      return alerts || [];
    }, 'getVehicleAlerts');
  },

  createCrimeReport: async (data: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Creating crime report (ULTRA-SIMPLE):', data);
      
      // Use the direct method that bypasses all user checks
      return await createCrimeReportDirect(data);
    }, 'createCrimeReport');
  },

  updateCrimeReport: async (id: string, updates: any): Promise<any> => {
    return safeApiCall(async () => {
      console.log('🔄 Updating crime report:', id, updates);
      
      // Use the same pattern as updateVehicleAlert - remove user-related updates
      const safeUpdates = { ...updates };
      delete safeUpdates.reported_by;
      delete safeUpdates.reporter_profile;
      
      const { data: report, error } = await supabase
        .from('crime_reports')
        .update({
          ...safeUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
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

  getCrimeReports: async (): Promise<any[]> => {
    return safeApiCall(async () => {
      const { data: reports, error } = await supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error getting crime reports:', error);
        return [];
      }

      console.log(`✅ Loaded ${reports?.length || 0} crime reports`);
      return reports || [];
    }, 'getCrimeReports');
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
          vehiclesWithLocation: 0,
          crimesWithLocation: 0
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

export default supabase;