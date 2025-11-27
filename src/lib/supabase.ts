// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Updated Types with proper statuses
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned';
export type ReportStatus = 'pending' | 'active' | 'resolved' | 'recovered' | 'rejected' | 'archived';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';
export type ReportType = 'theft' | 'assault' | 'burglary' | 'vandalism' | 'fraud' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
  metadata?: Record<string, any>;
}

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  user_metadata: {
    full_name?: string;
    role?: UserRole;
    avatar_url?: string;
    phone_number?: string;
  };
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  invited_at?: string;
  role?: string;
  status?: UserStatus;
  banned_until?: string | null;
  app_metadata?: Record<string, any>;
}

export interface VehicleAlert {
  id: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  year?: number;
  vin?: string;
  reason: string;
  last_seen_location: string;
  last_seen_time?: string;
  reported_location?: string;
  severity: SeverityType;
  status: ReportStatus;
  notes?: string;
  evidence_images?: string[];
  reported_by: string;
  created_at: string;
  updated_at: string;
  ob_number?: string;
  assigned_to?: string;
  priority?: number;
  tags?: string[];
}

export interface CrimeReport {
  id: string;
  title: string;
  description: string;
  location: string;
  incident_time?: string;
  report_type: ReportType;
  severity: SeverityType;
  status: ReportStatus;
  witness_info?: string;
  evidence_images?: string[];
  contact_allowed: boolean;
  reported_by: string;
  created_at: string;
  updated_at: string;
  ob_number?: string;
  assigned_to?: string;
  priority?: number;
  tags?: string[];
  anonymous: boolean;
}

export interface DashboardStats {
  todayReports: number;
  activeReports: number;
  resolvedVehicles: number;
  resolvedCrimes: number;
  vehiclesWithLocation: number;
  crimesWithLocation: number;
  totalUsers: number;
  pendingReports: number;
  criticalReports: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Helper function to extract data array from PaginatedResponse for filtering
export const getDataFromPaginatedResponse = <T>(response: PaginatedResponse<T>): T[] => {
  return response.data;
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'X-Client-Info': 'rapid-911-web@1.0.0'
    }
  }
});

// Utility functions
export const authUserToProfile = (authUser: AuthUser): Profile => ({
  id: authUser.id,
  email: authUser.email,
  full_name: authUser.user_metadata?.full_name || null,
  phone_number: authUser.user_metadata?.phone_number || null,
  avatar_url: authUser.user_metadata?.avatar_url || null,
  role: (authUser.user_metadata?.role as UserRole) || 'user',
  status: authUser.status || 'active',
  created_at: authUser.created_at,
  updated_at: authUser.updated_at || authUser.created_at,
  last_seen_at: authUser.last_sign_in_at || authUser.created_at,
  metadata: authUser.app_metadata || {}
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

export const isValidUserRole = (role: string): role is UserRole => {
  return ['admin', 'moderator', 'controller', 'user'].includes(role);
};

export const isValidReportStatus = (status: string): status is ReportStatus => {
  return ['pending', 'active', 'resolved', 'recovered', 'rejected', 'archived'].includes(status);
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

export const formatDisplayDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting display date:', error);
    return 'Invalid Date';
  }
};

// Generate OB numbers
export const generateOBNumber = (prefix: 'OBC' | 'OBV' | 'OBG' = 'OBC'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Hardcoded admin users for immediate fallback
const ADMIN_USERS = [
  'zweli@msn.com',
  'clint@rapid911.co.za',
  'zwell@msn.com',
  'admin@rapid911.co.za'
];

// In-memory cache for profiles to avoid database queries
const profileCache = new Map();
const reportCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Enhanced error handling that never throws
const safeApiCall = async <T>(operation: () => Promise<T>, context: string): Promise<T | null> => {
  try {
    const result = await operation();
    console.log(`✅ ${context}: Success`);
    return result;
  } catch (error: any) {
    console.error(`❌ ${context}:`, error);
    
    // Enhanced error logging
    if (error?.code) {
      console.error(`Error Code: ${error.code}, Message: ${error.message}`);
    }
    
    return null;
  }
};

const withCache = <T>(key: string, operation: () => Promise<T>, ttl: number = CACHE_TTL): Promise<T | null> => {
  const cached = reportCache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < ttl) {
    console.log(`📦 Using cached data for: ${key}`);
    return Promise.resolve(cached.data);
  }
  
  return operation().then(result => {
    reportCache.set(key, { data: result, timestamp: now });
    return result;
  });
};

const clearCache = (key?: string) => {
  if (key) {
    reportCache.delete(key);
  } else {
    reportCache.clear();
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
    status: 'active' as UserStatus,
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
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth error:', error);
        return null;
      }
      
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

  signOut: async (): Promise<boolean> => {
    const result = await safeApiCall(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear caches on sign out
      profileCache.clear();
      reportCache.clear();
      
      return true;
    }, 'signOut');
    
    return result || false;
  },

  getAllUsers: async (): Promise<any[]> => {
    const result = await safeApiCall(async () => {
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
    
    return result || [];
  },

  updateUserRole: async (userId: string, newRole: UserRole): Promise<boolean> => {
    const result = await safeApiCall(async () => {
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
        
        // Clear profile cache for this user
        profileCache.delete(userId);
        
        return true;
      } catch (error) {
        console.error('❌ Failed to update user role:', error);
        return false;
      }
    }, 'updateUserRole');
    
    return result || false;
  },

  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
    phone_number?: string;
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
    const result = await safeApiCall(async () => {
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
        
        // Clear profile cache for this user
        profileCache.delete(userId);
        
        return true;
      } catch (error) {
        console.error('❌ Failed to update user status:', error);
        return false;
      }
    }, 'updateUserStatus');
    
    return result || false;
  },

  resetPassword: async (email: string): Promise<boolean> => {
    const result = await safeApiCall(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      return true;
    }, 'resetPassword');
    
    return result || false;
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
      contact_allowed: Boolean(data.contact_allowed ?? false),
      anonymous: Boolean(data.anonymous ?? false),
      reported_by: user?.id || '00000000-0000-0000-0000-000000000000', // Fallback UUID
      ob_number: data.ob_number || generateOBNumber('OBC'),
      priority: data.priority || 1,
      tags: data.tags || []
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
    
    // Clear relevant caches
    clearCache('crime_reports');
    clearCache('dashboard_stats');
    
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
        license_plate: data.license_plate?.toUpperCase()?.replace(/\s/g, '') || 'UNKNOWN',
        vehicle_make: data.vehicle_make || 'UNKNOWN',
        vehicle_model: data.vehicle_model || 'UNKNOWN',
        vehicle_color: data.vehicle_color || 'UNKNOWN',
        year: data.year ? parseInt(data.year) : null,
        vin: data.vin || null,
        reason: data.reason || 'No reason provided',
        last_seen_location: data.last_seen_location || null,
        last_seen_time: data.last_seen_time ? new Date(data.last_seen_time).toISOString() : null,
        reported_location: data.reported_location || null,
        severity: data.severity || 'medium',
        status: data.status || 'active',
        notes: data.notes || null,
        evidence_images: data.evidence_images || [],
        reported_by: user.id,
        ob_number: data.ob_number || generateOBNumber('OBV'),
        priority: data.priority || 1,
        tags: data.tags || []
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
      
      // Clear relevant caches
      clearCache('vehicle_alerts');
      clearCache('dashboard_stats');
      
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
      
      // Clear relevant caches
      clearCache('vehicle_alerts');
      clearCache(`vehicle_alert_${id}`);
      clearCache('dashboard_stats');
      
      return alert;
    }, 'updateVehicleAlert');
  },

  getVehicleAlerts: async (pagination?: PaginationParams): Promise<PaginatedResponse<VehicleAlert>> => {
    const result = await safeApiCall(async () => {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const sortBy = pagination?.sortBy || 'created_at';
      const sortOrder = pagination?.sortOrder || 'desc';
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: alerts, error, count } = await supabase
        .from('vehicle_alerts')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('❌ Error getting vehicle alerts:', error);
        throw error;
      }

      const total = count || 0;
      console.log(`✅ Loaded ${alerts?.length || 0} vehicle alerts (page ${page})`);
      
      return {
        data: alerts || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }, 'getVehicleAlerts');
    
    return result || { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
  },

  // Alternative method that returns just the data array for filtering
  getVehicleAlertsData: async (): Promise<VehicleAlert[]> => {
    const result = await reportsAPI.getVehicleAlerts();
    return result.data;
  },

  getVehicleAlert: async (id: string): Promise<VehicleAlert | null> => {
    const cacheKey = `vehicle_alert_${id}`;
    
    const result = await withCache(cacheKey, async () => {
      const { data: alert, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error getting vehicle alert:', error);
        throw error;
      }

      return alert;
    });
    
    return result || null;
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
      
      // Clear relevant caches
      clearCache('crime_reports');
      clearCache(`crime_report_${id}`);
      clearCache('dashboard_stats');
      
      return report;
    }, 'updateCrimeReport');
  },

  getCrimeReports: async (pagination?: PaginationParams): Promise<PaginatedResponse<CrimeReport>> => {
    const result = await safeApiCall(async () => {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const sortBy = pagination?.sortBy || 'created_at';
      const sortOrder = pagination?.sortOrder || 'desc';
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: reports, error, count } = await supabase
        .from('crime_reports')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) {
        console.error('❌ Error getting crime reports:', error);
        throw error;
      }

      const total = count || 0;
      console.log(`✅ Loaded ${reports?.length || 0} crime reports (page ${page})`);
      
      return {
        data: reports || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    }, 'getCrimeReports');
    
    return result || { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
  },

  // Alternative method that returns just the data array for filtering
  getCrimeReportsData: async (): Promise<CrimeReport[]> => {
    const result = await reportsAPI.getCrimeReports();
    return result.data;
  },

  getCrimeReport: async (id: string): Promise<CrimeReport | null> => {
    const cacheKey = `crime_report_${id}`;
    
    const result = await withCache(cacheKey, async () => {
      const { data: report, error } = await supabase
        .from('crime_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error getting crime report:', error);
        throw error;
      }

      return report;
    });
    
    return result || null;
  },

  searchReports: async (query: string, type?: 'vehicle' | 'crime'): Promise<any[]> => {
    const result = await safeApiCall(async () => {
      if (!query.trim()) return [];

      const searchQuery = `%${query.trim()}%`;
      const results: any[] = [];
      
      if (type === 'vehicle' || !type) {
        const { data: vehicleAlerts, error } = await supabase
          .from('vehicle_alerts')
          .select('*')
          .or(`license_plate.ilike.${searchQuery},vehicle_make.ilike.${searchQuery},vehicle_model.ilike.${searchQuery},reason.ilike.${searchQuery}`)
          .limit(20);

        if (!error && vehicleAlerts) {
          results.push(...vehicleAlerts.map(alert => ({ ...alert, type: 'vehicle' })));
        }
      }

      if (type === 'crime' || !type) {
        const { data: crimeReports, error } = await supabase
          .from('crime_reports')
          .select('*')
          .or(`title.ilike.${searchQuery},description.ilike.${searchQuery},location.ilike.${searchQuery},report_type.ilike.${searchQuery}`)
          .limit(20);

        if (!error && crimeReports) {
          results.push(...crimeReports.map(report => ({ ...report, type: 'crime' })));
        }
      }

      return results;
    }, 'searchReports');
    
    return result || [];
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const cacheKey = 'dashboard_stats';
    
    const result = await withCache(cacheKey, async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const [
          vehiclesCount,
          crimesCount,
          activeVehiclesCount,
          activeCrimesCount,
          resolvedVehiclesCount,
          resolvedCrimesCount,
          pendingVehiclesCount,
          pendingCrimesCount,
          criticalVehiclesCount,
          criticalCrimesCount,
          usersCount
        ] = await Promise.all([
          // Today's reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).gte('created_at', todayISO),
          supabase.from('crime_reports').select('id', { count: 'exact' }).gte('created_at', todayISO),
          
          // Active reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('status', 'active'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('status', 'active'),
          
          // Resolved reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('status', 'resolved'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('status', 'resolved'),
          
          // Pending reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('status', 'pending'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
          
          // Critical reports
          supabase.from('vehicle_alerts').select('id', { count: 'exact' }).eq('severity', 'critical'),
          supabase.from('crime_reports').select('id', { count: 'exact' }).eq('severity', 'critical'),
          
          // Total users
          authAPI.getAllUsers()
        ]);

        const stats: DashboardStats = {
          todayReports: (vehiclesCount.count || 0) + (crimesCount.count || 0),
          activeReports: (activeVehiclesCount.count || 0) + (activeCrimesCount.count || 0),
          resolvedVehicles: resolvedVehiclesCount.count || 0,
          resolvedCrimes: resolvedCrimesCount.count || 0,
          vehiclesWithLocation: 0, // Could be enhanced with actual location data
          crimesWithLocation: 0,   // Could be enhanced with actual location data
          totalUsers: Array.isArray(usersCount) ? usersCount.length : 0,
          pendingReports: (pendingVehiclesCount.count || 0) + (pendingCrimesCount.count || 0),
          criticalReports: (criticalVehiclesCount.count || 0) + (criticalCrimesCount.count || 0)
        };

        return stats;
      } catch (error) {
        console.error('❌ Error in getDashboardStats:', error);
        return {
          todayReports: 0,
          activeReports: 0,
          resolvedVehicles: 0,
          resolvedCrimes: 0,
          vehiclesWithLocation: 0,
          crimesWithLocation: 0,
          totalUsers: 0,
          pendingReports: 0,
          criticalReports: 0
        };
      }
    });
    
    return result || {
      todayReports: 0,
      activeReports: 0,
      resolvedVehicles: 0,
      resolvedCrimes: 0,
      vehiclesWithLocation: 0,
      crimesWithLocation: 0,
      totalUsers: 0,
      pendingReports: 0,
      criticalReports: 0
    };
  },

  // Clear all caches (useful for admin functions)
  clearCache: () => {
    clearCache();
    profileCache.clear();
    console.log('🧹 All caches cleared');
  }
};

// Storage API
export const storageAPI = {
  uploadImage: async (bucket: string, file: File, path: string): Promise<string> => {
    const result = await safeApiCall(async () => {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images only.');
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 5MB.');
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return publicUrl;
    }, 'uploadImage');
    
    return result || '';
  },

  deleteImage: async (bucket: string, path: string): Promise<void> => {
    await safeApiCall(async () => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    }, 'deleteImage');
  },

  getImageUrl: (bucket: string, path: string): string => {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return publicUrl;
  },

  listFiles: async (bucket: string, folder?: string): Promise<string[]> => {
    const result = await safeApiCall(async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder);

      if (error) throw error;

      return data?.map(file => file.name) || [];
    }, 'listFiles');
    
    return result || [];
  }
};

// Export cache management functions
export const cacheAPI = {
  clear: (key?: string) => clearCache(key),
  getStats: () => ({
    profileCacheSize: profileCache.size,
    reportCacheSize: reportCache.size,
    profileCacheKeys: Array.from(profileCache.keys()),
    reportCacheKeys: Array.from(reportCache.keys())
  })
};

export default supabase;