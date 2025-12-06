// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Types
export type ReportStatus = 'active' | 'pending' | 'resolved' | 'rejected' | 'recovered';
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user' | 'responder'; // ADDED 'responder'
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  companies: Company;
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
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: ReportStatus;
  notes?: string;
  evidence_images?: string[];
  reported_by: string;
  ob_number?: string;
  company_id?: string;
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
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: ReportStatus;
  witness_info?: string;
  evidence_images?: string[];
  contact_allowed: boolean;
  reported_by: string;
  ob_number?: string;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  report_id: string;
  report_type: 'vehicle' | 'crime' | 'system';
  user_id: string;
  user_email: string;
  timestamp: string;
  details: any;
  created_at: string;
}

export interface DispatchRecord {
  id: string;
  report_id: string;
  report_type: 'vehicle' | 'crime';
  assigned_to: string;
  status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
  company_id?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    role?: UserRole;
    company_id?: string;
  };
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  role: UserRole;
  status: UserStatus;
  company_id?: string;
}

// Initialize regular Supabase client (for browser use)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Initialize admin client ONLY on server-side
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (typeof window === 'undefined') {
  // Server-side only - safe to use service role key
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } else {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set on server');
  }
}

// Helper to get admin client (returns null in browser)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    console.error('❌ Cannot use admin client in browser');
    return null;
  }
  return supabaseAdmin;
};

// Type guard functions
export const isVehicleAlert = (report: any): report is VehicleAlert => {
  return report && 
         typeof report.license_plate === 'string' &&
         typeof report.vehicle_make === 'string' &&
         typeof report.vehicle_model === 'string' &&
         typeof report.vehicle_color === 'string';
};

export const isCrimeReport = (report: any): report is CrimeReport => {
  return report && 
         typeof report.title === 'string' &&
         typeof report.description === 'string' &&
         typeof report.location === 'string' &&
         typeof report.report_type === 'string';
};

// Utility functions
export const formatDateForDateTimeLocal = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Company API
export const companyAPI = {
  // Get all companies (admin sees all, moderators see only their company)
  getAllCompanies: async (): Promise<Company[]> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    // Get user's full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // If profile not found, return empty array
    if (profileError || !profile) {
      console.warn('Profile not found for user:', session.user.id, profileError?.message);
      return [];
    }

    let query = supabase.from('companies').select('*');
    
    // If user is moderator, only show their company
    if (profile.role === 'moderator' && profile.company_id) {
      query = query.eq('id', profile.company_id);
    }
    // Admins and controllers see all companies
    else if (profile.role !== 'admin' && profile.role !== 'controller') {
      return []; // Regular users see no companies
    }

    const { data, error } = await query.order('name');
    
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
},
  
  // Get company by ID
  getCompanyById: async (companyId: string): Promise<Company | null> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  },

  // Create company - only admins
  createCompany: async (companyData: { name: string; }): Promise<Company> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const { data, error } = await supabase
        .from('companies')
        .insert([{
          name: companyData.name,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  // Update company - only admins
  updateCompany: async (companyId: string, updates: Partial<Company>): Promise<Company> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      const { data, error } = await supabase
        .from('companies')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  // Delete company - only admins
  deleteCompany: async (companyId: string): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Check if company has users
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);

      if (users && users.length > 0) {
        throw new Error('Cannot delete company with existing users');
      }

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  // Get users by company
  getUsersByCompany: async (companyId: string): Promise<Profile[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching company users:', error);
      return [];
    }
  },

  // Assign user to company
  assignUserToCompany: async (userId: string, companyId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify current user has permission
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile) return false;

      // Admins can assign to any company, moderators only to their own company
      if (currentUserProfile.role === 'moderator') {
        if (companyId !== currentUserProfile.company_id) {
          console.error('❌ Moderators can only assign users to their own company');
          return false;
        }
      } else if (currentUserProfile.role !== 'admin') {
        console.error('❌ Admin or moderator access required');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          company_id: companyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error updating user company:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error assigning user to company:', error);
      return false;
    }
  },
};

// Reports API with company filtering
export const reportsAPI = {
  // Vehicle Reports with company filtering
  createVehicleAlert: async (reportData: any): Promise<VehicleAlert> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .insert([{
          ...reportData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating vehicle alert:', error);
      throw error;
    }
  },

  getVehicleAlerts: async (userRole?: UserRole, companyId?: string): Promise<VehicleAlert[]> => {
    try {
      let query = supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply company filtering for non-admin users
      if (userRole !== 'admin' && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching vehicle alerts:', error);
      return [];
    }
  },

  updateVehicleAlert: async (id: string, updates: any): Promise<VehicleAlert> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating vehicle alert:', error);
      throw error;
    }
  },

  deleteVehicleAlert: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('vehicle_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting vehicle alert:', error);
      throw error;
    }
  },

  // Crime Reports with company filtering
  createCrimeReport: async (reportData: any): Promise<CrimeReport> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .insert([{
          ...reportData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating crime report:', error);
      throw error;
    }
  },

  getCrimeReports: async (userRole?: UserRole, companyId?: string): Promise<CrimeReport[]> => {
    try {
      let query = supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply company filtering for non-admin users
      if (userRole !== 'admin' && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching crime reports:', error);
      return [];
    }
  },

  updateCrimeReport: async (id: string, updates: any): Promise<CrimeReport> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating crime report:', error);
      throw error;
    }
  },

  deleteCrimeReport: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('crime_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting crime report:', error);
      throw error;
    }
  },

  // Update report status with responder actions
updateReportWithResponderAction: async (
  reportId: string, 
  reportType: 'vehicle' | 'crime',
  updates: any,
  responderId?: string
): Promise<any> => {
  try {
    let data;
    
    if (reportType === 'vehicle') {
      const { data: reportData, error } = await supabase
        .from('vehicle_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          responder_id: responderId || null
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      data = reportData;
    } else {
      const { data: reportData, error } = await supabase
        .from('crime_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          responder_id: responderId || null
        })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;
      data = reportData;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating report with responder action:', error);
    throw error;
  }
},

// Get reports assigned to a specific responder
getResponderAssignedReports: async (responderId: string): Promise<any[]> => {
  try {
    const [vehicleReports, crimeReports] = await Promise.all([
      supabase
        .from('vehicle_alerts')
        .select('*')
        .eq('responder_id', responderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('crime_reports')
        .select('*')
        .eq('responder_id', responderId)
        .order('created_at', { ascending: false })
    ]);

    const vehicles = vehicleReports.data || [];
    const crimes = crimeReports.data || [];
    
    return [...vehicles, ...crimes];
  } catch (error) {
    console.error('Error fetching responder assigned reports:', error);
    return [];
  }
},

  // Dashboard Stats with company filtering
  getDashboardStats: async (userRole?: UserRole, companyId?: string): Promise<any> => {
    try {
      const [vehiclesData, crimesData] = await Promise.all([
        reportsAPI.getVehicleAlerts(userRole, companyId),
        reportsAPI.getCrimeReports(userRole, companyId)
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayVehicles = vehiclesData.filter((report: VehicleAlert) => 
        new Date(report.created_at) >= today
      );
      const todayCrimes = crimesData.filter((report: CrimeReport) => 
        new Date(report.created_at) >= today
      );

      const activeVehicles = vehiclesData.filter((v: VehicleAlert) => 
        ['active', 'pending'].includes(v.status)
      );
      const activeCrimes = crimesData.filter((c: CrimeReport) => 
        ['active', 'pending'].includes(c.status)
      );

      return {
        todayReports: todayVehicles.length + todayCrimes.length,
        activeReports: activeVehicles.length + activeCrimes.length,
        totalVehicles: vehiclesData.length,
        totalCrimes: crimesData.length,
        resolvedVehicles: vehiclesData.filter((v: VehicleAlert) => v.status === 'resolved' || v.status === 'recovered').length,
        resolvedCrimes: crimesData.filter((c: CrimeReport) => c.status === 'resolved').length
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        todayReports: 0,
        activeReports: 0,
        totalVehicles: 0,
        totalCrimes: 0,
        resolvedVehicles: 0,
        resolvedCrimes: 0
      };
    }
  },

  // Search and Filter with company filtering
  searchVehicleAlerts: async (query: string, userRole?: UserRole, companyId?: string): Promise<VehicleAlert[]> => {
    try {
      let dbQuery = supabase
        .from('vehicle_alerts')
        .select('*')
        .or(`license_plate.ilike.%${query}%,vehicle_make.ilike.%${query}%,vehicle_model.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      // Apply company filtering for non-admin users
      if (userRole !== 'admin' && companyId) {
        dbQuery = dbQuery.eq('company_id', companyId);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching vehicle alerts:', error);
      return [];
    }
  },

  searchCrimeReports: async (query: string, userRole?: UserRole, companyId?: string): Promise<CrimeReport[]> => {
    try {
      let dbQuery = supabase
        .from('crime_reports')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      // Apply company filtering for non-admin users
      if (userRole !== 'admin' && companyId) {
        dbQuery = dbQuery.eq('company_id', companyId);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching crime reports:', error);
      return [];
    }
  },

  // Audit Logs API
  getAuditLogs: async (limit: number = 100): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },

  logAuditAction: async (logData: {
    action: string;
    report_id: string;
    report_type: 'vehicle' | 'crime' | 'system';
    user_id: string;
    user_email: string;
    details: any;
  }): Promise<AuditLog> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([{
          ...logData,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging audit action:', error);
      throw error;
    }
  },

  // Dispatch Records API
  getDispatchRecords: async (): Promise<DispatchRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching dispatch records:', error);
      return [];
    }
  },

  createDispatchRecord: async (dispatchData: {
    report_id: string;
    report_type: 'vehicle' | 'crime';
    assigned_to: string;
    status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    notes: string;
  }): Promise<DispatchRecord> => {
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .insert([{
          ...dispatchData,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating dispatch record:', error);
      throw error;
    }
  },

  updateDispatchRecord: async (id: string, updates: Partial<DispatchRecord>): Promise<DispatchRecord> => {
    try {
      const { data, error } = await supabase
        .from('dispatch_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating dispatch record:', error);
      throw error;
    }
  },

  deleteDispatchRecord: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('dispatch_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting dispatch record:', error);
      throw error;
    }
  }
};

// Auth API
export const authAPI = {
  // Get all users (admin sees all, moderators see only their company users)
  getAllUsers: async (currentUserRole?: UserRole, companyId?: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    // Get current user's profile to check permissions
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, company_id, status, created_at, updated_at') // ADD ALL FIELDS
      .eq('id', session.user.id)
      .single();
    
    if (!currentUserProfile) return [];
    
    // For non-admin users, use a different approach
    if (currentUserProfile.role !== 'admin') {
      // Get profiles from the profiles table instead of admin API
      let query = supabase
        .from('profiles')
        .select('*');
      
      // If user is moderator, only show users from their company
      if (currentUserProfile.role === 'moderator' && currentUserProfile.company_id) {
        query = query.eq('company_id', currentUserProfile.company_id);
      }
      
      const { data: profiles, error } = await query;
      
      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }
      
      // Map profiles to AuthUser format
      return profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        status: profile.status || 'active',
        company_id: profile.company_id,
        user_metadata: {
          full_name: profile.full_name,
          role: profile.role
        },
        created_at: profile.created_at,
        updated_at: profile.updated_at
      } as AuthUser)) || [];
    }
    
    // For admin users, try to use admin API with fallback
    try {
      // First try to get users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (!profilesError && profiles) {
        return profiles.map(profile => ({
          id: profile.id,
          email: profile.email,
          role: profile.role || 'user',
          status: profile.status || 'active',
          company_id: profile.company_id,
          user_metadata: {
            full_name: profile.full_name,
            role: profile.role
          },
          created_at: profile.created_at,
          updated_at: profile.updated_at
        } as AuthUser));
      }
      
      // Fallback: Return current user only if admin API fails
      console.warn('Admin API access failed, falling back to basic user info');
      return [{
        id: session.user.id,
        email: session.user.email!,
        role: currentUserProfile.role,
        status: currentUserProfile.status || 'active',
        company_id: currentUserProfile.company_id,
        user_metadata: {
          full_name: currentUserProfile.full_name,
          role: currentUserProfile.role
        },
        created_at: currentUserProfile.created_at,
        updated_at: currentUserProfile.updated_at
      } as AuthUser];
      
    } catch (error) {
      console.error('Error in admin user fetch:', error);
      // Return minimal user info
      return [{
        id: session.user.id,
        email: session.user.email!,
        role: currentUserProfile.role,
        status: currentUserProfile.status || 'active',
        company_id: currentUserProfile.company_id,
        user_metadata: {
          full_name: currentUserProfile.full_name,
          role: currentUserProfile.role
        },
        created_at: currentUserProfile.created_at,
        updated_at: currentUserProfile.updated_at
      } as AuthUser];
    }
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
},
  // Update user role - only admins can do this
  updateUserRole: async (userId: string, role: UserRole): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role !== 'admin') {
        console.error('❌ Admin access required to update user role');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error updating user role:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  },

  // Update user status - only admins can do this
  updateUserStatus: async (userId: string, status: UserStatus): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role !== 'admin') {
        console.error('❌ Admin access required to update user status');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error updating user status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  },

  // Delete user - only admins can do this
  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role !== 'admin') {
        console.error('❌ Admin access required to delete users');
        return false;
      }

      // Prevent self-deletion
      if (userId === user.id) {
        console.error('❌ Cannot delete yourself');
        return false;
      }

      // Delete user profile (auth user will be handled by cascade or trigger)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error deleting user:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  // Assign user to company - admins and moderators can do this
  assignUserToCompany: async (userId: string, companyId: string | null): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Verify current user has permission
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .single();

      if (!currentUserProfile) return false;

      // Admins can assign to any company, moderators only to their own company
      if (currentUserProfile.role === 'moderator') {
        if (companyId !== currentUserProfile.company_id) {
          console.error('❌ Moderators can only assign users to their own company');
          return false;
        }
      } else if (currentUserProfile.role !== 'admin') {
        console.error('❌ Admin or moderator access required');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          company_id: companyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Error updating user company:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error assigning user to company:', error);
      return false;
    }
  },

  // Create user with company assignment - only admins
  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
    company_id?: string;
  }): Promise<any> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify current user is admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (adminProfile?.role !== 'admin') {
        throw new Error('Admin access required to create users');
      }

      // Create the user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name || '',
          role: userData.role || 'user',
          company_id: userData.company_id
        }
      });
      
      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No user created');
      }
      
      // Create the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name || '',
          role: userData.role || 'user',
          status: 'active' as UserStatus,
          company_id: userData.company_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw profileError;
      }
      
      return {
        ...authData.user,
        profile: profileData
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Get user profile
  getUserProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: Partial<Profile>): Promise<Profile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get current user profile
  getCurrentUserProfile: async (): Promise<Profile | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      return null;
    }
  },

  // Update current user profile
  updateCurrentUserProfile: async (updates: Partial<Profile>): Promise<Profile> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating current user profile:', error);
      throw error;
    }
  }
};

// Image handling utilities
export const imageUtils = {
  // Convert file to base64 data URL
  fileToDataURL: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },

  // Validate image file
  validateImage: (file: File): { valid: boolean; error?: string } => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid image format. Please use JPEG, PNG, GIF, or WebP.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image size too large. Maximum size is 5MB.' };
    }

    return { valid: true };
  },

  // Process multiple images
  processImages: async (files: FileList): Promise<string[]> => {
    const dataUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = imageUtils.validateImage(file);
      
      if (validation.valid) {
        try {
          const dataUrl = await imageUtils.fileToDataURL(file);
          dataUrls.push(dataUrl);
        } catch (error) {
          console.warn(`Failed to process image ${file.name}:`, error);
        }
      } else {
        console.warn(`Skipping invalid image ${file.name}:`, validation.error);
      }
    }

    return dataUrls;
  }
};

// Real-time subscriptions
export const realtimeAPI = {
  // Subscribe to vehicle alerts
  subscribeToVehicleAlerts: (callback: (payload: any) => void) => {
    return supabase
      .channel('vehicle_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_alerts'
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to crime reports
  subscribeToCrimeReports: (callback: (payload: any) => void) => {
    return supabase
      .channel('crime_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crime_reports'
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to user updates
  subscribeToUsers: (callback: (payload: any) => void) => {
    return supabase
      .channel('profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to company updates
  subscribeToCompanies: (callback: (payload: any) => void) => {
    return supabase
      .channel('companies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to audit logs
  subscribeToAuditLogs: (callback: (payload: any) => void) => {
    return supabase
      .channel('audit_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs'
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to dispatch records
  subscribeToDispatchRecords: (callback: (payload: any) => void) => {
    return supabase
      .channel('dispatch_records')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_records'
        },
        callback
      )
      .subscribe();
  }
};

// Helper function to get current user's session token
export const getSessionToken = async (): Promise<string | null> => {
  try {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || null;
  } catch (error) {
    console.error('Error getting session token:', error);
    return null;
  }
};

// Helper function to check if user has admin role
export const isUserAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Helper function to check if user has moderator role
export const isUserModerator = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'moderator';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Helper function to check if user has controller role
export const isUserController = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'controller';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};

// Helper function to get user's company ID
export const getUserCompanyId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    return profile?.company_id || null;
  } catch (error) {
    console.error('Error getting user company ID:', error);
    return null;
  }
};

// Helper function to get user's role
export const getUserRole = async (): Promise<UserRole | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Helper function to get user's status
export const getUserStatus = async (): Promise<UserStatus | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    return profile?.status || null;
  } catch (error) {
    console.error('Error getting user status:', error);
    return null;
  }
};

// Export everything
export default supabase;