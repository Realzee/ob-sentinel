import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'rejected';

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

// Enhanced authAPI with all required methods
export const authAPI = {
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return { ...user, profile };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
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
        .from('profiles')
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

  async ensureUserExists(userId: string, email: string) {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingProfile) {
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId, 
            email, 
            role: 'user', 
            status: 'pending' 
          }])
          .select()
          .single();

        if (error) throw error;
        return newProfile;
      }
      return existingProfile;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  },

  async makeUserAdmin(email: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({ 
          role: 'admin', 
          status: 'active',
          full_name: 'Zweli Admin'
        })
        .eq('email', email)
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

// Enhanced reportsAPI with all required methods
export const reportsAPI = {
  async getVehicleAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
        .select('*, profiles:reported_by(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting vehicle alerts:', error);
      return [];
    }
  },

  async createVehicleAlert(alertData: any) {
    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
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

  async updateVehicleAlert(id: string, updates: Partial<VehicleAlert>) {
    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
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

  async getCrimeReports() {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*, profiles:reported_by(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting crime reports:', error);
      return [];
    }
  },

  async createCrimeReport(reportData: any) {
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

  async updateCrimeReport(id: string, updates: Partial<CrimeReport>) {
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

  async getDashboardStats() {
    try {
      const [vehicles, crimes] = await Promise.all([
        supabase.from('alerts_vehicles').select('*', { count: 'exact' }),
        supabase.from('crime_reports').select('*', { count: 'exact' })
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayVehicles = vehicles.data?.filter(v => 
        v.created_at.split('T')[0] === today
      ).length || 0;

      return {
        totalVehicles: vehicles.count || 0,
        totalCrimes: crimes.count || 0,
        todayVehicles,
        activeVehicles: vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0,
        resolvedVehicles: vehicles.data?.filter(v => v.status === 'resolved').length || 0,
        vehiclesWithLocation: vehicles.data?.filter(v => v.last_seen_location).length || 0,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalVehicles: 0,
        totalCrimes: 0,
        todayVehicles: 0,
        activeVehicles: 0,
        resolvedVehicles: 0,
        vehiclesWithLocation: 0,
      };
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
        .select('*, profiles:assigned_to(full_name, badge_number)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting dispatch logs:', error);
      return [];
    }
  }
};