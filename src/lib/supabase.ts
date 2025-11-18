import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Types
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'rejected';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

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

// Database insert/update types
export type VehicleAlertInsert = Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at'>;
export type VehicleAlertUpdate = Partial<Omit<VehicleAlert, 'id' | 'created_at' | 'updated_at'>>;

export type CrimeReportInsert = Omit<CrimeReport, 'id' | 'created_at' | 'updated_at'>;
export type CrimeReportUpdate = Partial<Omit<CrimeReport, 'id' | 'created_at' | 'updated_at'>>;

// Auth API
export const authAPI = {
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Creating new profile for user:', user.email);
        return await this.createProfile(user.id, user.email!);
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { ...user, profile: null };
      }

      return { ...user, profile };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async createProfile(userId: string, email: string) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert([{ 
          id: userId, 
          email, 
          role: 'user', 
          status: 'active' 
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        // Return user without profile if creation fails
        const { data: { user } } = await supabase.auth.getUser();
        return user ? { ...user, profile: null } : null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      return user ? { ...user, profile } : null;
    } catch (error) {
      console.error('Error in createProfile:', error);
      const { data: { user } } = await supabase.auth.getUser();
      return user ? { ...user, profile: null } : null;
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  },

  async updateUserRole(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  async makeUserAdmin(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .update({ 
          role: 'admin', 
          status: 'active',
          full_name: 'Zweli Admin'
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Error making user admin:', error);
      throw error;
    }
  },
};

// Reports API
export const reportsAPI = {
  // Vehicle Reports
  async getVehicleAlerts() {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*, user_profiles:reported_by(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting vehicle alerts:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in getVehicleAlerts:', error);
      return [];
    }
  },

  async createVehicleAlert(alertData: VehicleAlertInsert) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .insert([alertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating vehicle alert:', error);
      throw error;
    }
  },

  async updateVehicleAlert(id: string, updates: VehicleAlertUpdate) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .update(updates)
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

  async deleteVehicleAlert(id: string) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting vehicle alert:', error);
      throw error;
    }
  },

  // Crime Reports
  async getCrimeReports() {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*, user_profiles:reported_by(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting crime reports:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Error in getCrimeReports:', error);
      return [];
    }
  },

  async createCrimeReport(reportData: CrimeReportInsert) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .insert([reportData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating crime report:', error);
      throw error;
    }
  },

  async updateCrimeReport(id: string, updates: CrimeReportUpdate) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .update(updates)
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

  async deleteCrimeReport(id: string) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting crime report:', error);
      throw error;
    }
  },

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const [vehicles, crimes] = await Promise.all([
        supabase.from('vehicle_alerts').select('*', { count: 'exact' }),
        supabase.from('crime_reports').select('*', { count: 'exact' })
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayVehicles = vehicles.data?.filter(v => 
        v.created_at.split('T')[0] === today
      ).length || 0;

      const todayCrimes = crimes.data?.filter(c => 
        c.created_at.split('T')[0] === today
      ).length || 0;

      return {
        // Vehicle Stats
        totalVehicles: vehicles.count || 0,
        todayVehicles,
        activeVehicles: vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0,
        resolvedVehicles: vehicles.data?.filter(v => v.status === 'resolved').length || 0,
        vehiclesWithLocation: vehicles.data?.filter(v => v.last_seen_location).length || 0,
        
        // Crime Stats
        totalCrimes: crimes.count || 0,
        todayCrimes,
        activeCrimes: crimes.data?.filter(c => c.status === 'pending' || c.status === 'under_review').length || 0,
        resolvedCrimes: crimes.data?.filter(c => c.status === 'resolved').length || 0,
        crimesWithLocation: crimes.data?.filter(c => c.location).length || 0,

        // Combined Stats
        totalReports: (vehicles.count || 0) + (crimes.count || 0),
        todayReports: todayVehicles + todayCrimes,
        activeReports: (vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0) + 
                      (crimes.data?.filter(c => c.status === 'pending' || c.status === 'under_review').length || 0),
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        // Vehicle Stats
        totalVehicles: 0,
        todayVehicles: 0,
        activeVehicles: 0,
        resolvedVehicles: 0,
        vehiclesWithLocation: 0,
        
        // Crime Stats
        totalCrimes: 0,
        todayCrimes: 0,
        activeCrimes: 0,
        resolvedCrimes: 0,
        crimesWithLocation: 0,

        // Combined Stats
        totalReports: 0,
        todayReports: 0,
        activeReports: 0,
      };
    }
  },

  // Search and Filter Methods
  async searchVehicleAlerts(query: string) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*, user_profiles:reported_by(full_name, email)')
        .or(`license_plate.ilike.%${query}%,vehicle_make.ilike.%${query}%,vehicle_model.ilike.%${query}%,last_seen_location.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching vehicle alerts:', error);
      return [];
    }
  },

  async searchCrimeReports(query: string) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*, user_profiles:reported_by(full_name, email)')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,report_type.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching crime reports:', error);
      return [];
    }
  },

  // Filter by status
  async getVehicleAlertsByStatus(status: ReportStatus) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*, user_profiles:reported_by(full_name, email)')
        .eq('status', status)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting vehicle alerts by status:', error);
      return [];
    }
  },

  async getCrimeReportsByStatus(status: ReportStatus) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*, user_profiles:reported_by(full_name, email)')
        .eq('status', status)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting crime reports by status:', error);
      return [];
    }
  },

  // Get reports by user
  async getUserVehicleAlerts(userId: string) {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*, user_profiles:reported_by(full_name, email)')
        .eq('reported_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user vehicle alerts:', error);
      return [];
    }
  },

  async getUserCrimeReports(userId: string) {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*, user_profiles:reported_by(full_name, email)')
        .eq('reported_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user crime reports:', error);
      return [];
    }
  }
};

// Dispatch functions
export const dispatchAPI = {
  async createDispatchLog(logData: any) {
    try {
      const { data, error } = await supabase
        .from('dispatch_logs')
        .insert([logData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating dispatch log:', error);
      throw error;
    }
  },

  async getDispatchLogs() {
    try {
      const { data, error } = await supabase
        .from('dispatch_logs')
        .select('*, user_profiles:assigned_to(full_name, badge_number)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting dispatch logs:', error);
      return [];
    }
  },

  async getDispatchLogsByIncident(incidentId: string, incidentType: string) {
    try {
      const { data, error } = await supabase
        .from('dispatch_logs')
        .select('*, user_profiles:assigned_to(full_name, badge_number)')
        .eq('incident_id', incidentId)
        .eq('incident_type', incidentType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting dispatch logs by incident:', error);
      return [];
    }
  }
};

// Utility functions
export const utilsAPI = {
  async getRecentActivity(limit: number = 10) {
    try {
      const [vehicles, crimes] = await Promise.all([
        supabase
          .from('vehicle_alerts')
          .select('id, license_plate, status, severity, created_at, reported_by, user_profiles:reported_by(full_name)')
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('crime_reports')
          .select('id, title, status, severity, created_at, reported_by, user_profiles:reported_by(full_name)')
          .order('created_at', { ascending: false })
          .limit(limit)
      ]);

      const combined = [
        ...(vehicles.data?.map(v => ({ ...v, type: 'vehicle' as const })) || []),
        ...(crimes.data?.map(c => ({ ...c, type: 'crime' as const })) || [])
      ];

      return combined
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  },

  async getSystemStats() {
    try {
      const [users, vehicles, crimes, dispatches] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact' }),
        supabase.from('vehicle_alerts').select('*', { count: 'exact' }),
        supabase.from('crime_reports').select('*', { count: 'exact' }),
        supabase.from('dispatch_logs').select('*', { count: 'exact' })
      ]);

      return {
        totalUsers: users.count || 0,
        totalVehicles: vehicles.count || 0,
        totalCrimes: crimes.count || 0,
        totalDispatches: dispatches.count || 0,
        activeUsers: users.data?.filter(u => u.status === 'active').length || 0,
        pendingReports: (vehicles.data?.filter(v => v.status === 'pending').length || 0) + 
                       (crimes.data?.filter(c => c.status === 'pending').length || 0)
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        totalUsers: 0,
        totalVehicles: 0,
        totalCrimes: 0,
        totalDispatches: 0,
        activeUsers: 0,
        pendingReports: 0
      };
    }
  }
};

// Type guards
export const isVehicleAlert = (report: any): report is VehicleAlert => {
  return 'license_plate' in report;
};

export const isCrimeReport = (report: any): report is CrimeReport => {
  return 'title' in report;
};

// Export individual functions for backward compatibility
export const ensureUserExists = authAPI.createProfile;
export const getAllUsers = authAPI.getAllUsers;
export const updateUserRole = authAPI.updateUserRole;
export const makeUserAdmin = authAPI.makeUserAdmin;