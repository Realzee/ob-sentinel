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
  witness_info?: string;
  evidence_images?: string[];
  contact_allowed: boolean;
  reported_by: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  ob_number?: string;
}

// Auth API with proper typing
export interface AuthAPI {
  getCurrentUser(): Promise<any>;
  createProfile(userId: string, email: string): Promise<any>;
  getAllUsers(): Promise<Profile[]>;
  updateUserRole(userId: string, updates: Partial<Profile>): Promise<any>;
  makeUserAdmin(userId: string): Promise<any>;
  getAllUsersWithAuth(): Promise<any[]>;
  updateUser(userId: string, updates: Partial<Profile>): Promise<any>;
  deleteUser(userId: string): Promise<any>;
  suspendUser(userId: string): Promise<any>;
  activateUser(userId: string): Promise<any>;
}

export const authAPI: AuthAPI = {
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('❌ No user found or error:', error);
        return null;
      }

      console.log('🔍 Auth user found:', { id: user.id, email: user.email });

      // Check if profile exists with better error handling
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, create it
      if (profileError) {
        console.log('📝 Profile error:', profileError);
        
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows found')) {
          console.log('📝 Creating new profile for user:', user.email);
          return await this.createProfile(user.id, user.email!);
        } else {
          console.error('❌ Error fetching profile:', profileError);
          // Return basic user with default values
          return {
            id: user.id,
            email: user.email,
            full_name: null,
            role: 'user',
            status: 'active',
            profile: null
          };
        }
      }

      console.log('✅ Profile found:', { 
        full_name: profile.full_name, 
        role: profile.role, 
        status: profile.status 
      });

      // FIXED: Return properly merged user object with profile data at top level
      const mergedUser = {
        // Auth user properties
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
        
        // Profile properties (these will be directly accessible)
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        status: profile.status,
        department: profile.department,
        badge_number: profile.badge_number,
        profile_created_at: profile.created_at,
        profile_updated_at: profile.updated_at,
        
        // Keep nested profile for backward compatibility
        profile: profile
      };

      console.log('🎯 Final merged user structure:', { 
        id: mergedUser.id,
        email: mergedUser.email,
        full_name: mergedUser.full_name,
        role: mergedUser.role,
        status: mergedUser.status,
        hasProfile: !!mergedUser.profile
      });

      return mergedUser;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  },

  async createProfile(userId: string, email: string) {
    try {
      console.log('📝 Creating profile for:', { userId, email });
      
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
        console.error('❌ Error creating profile:', error);
        // Return user with default values
        return { 
          id: userId,
          email: email,
          full_name: null,
          role: 'user',
          status: 'active',
          profile: null
        };
      }

      // FIXED: Return properly merged user after profile creation
      const mergedUser = {
        id: userId,
        email: email,
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        role: profile.role,
        status: profile.status,
        department: profile.department,
        badge_number: profile.badge_number,
        profile_created_at: profile.created_at,
        profile_updated_at: profile.updated_at,
        profile: profile
      };
      
      console.log('✅ Profile created successfully:', { 
        full_name: mergedUser.full_name, 
        role: mergedUser.role 
      });
      
      return mergedUser;
    } catch (error) {
      console.error('❌ Error in createProfile:', error);
      return { 
        id: userId,
        email: email,
        full_name: null,
        role: 'user',
        status: 'active',
        profile: null
      };
    }
  },

  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting all users:', error);
        return [];
      }
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

      if (error) {
        console.error('Error making user admin:', error);
        throw error;
      }
      return profile;
    } catch (error) {
      console.error('Error making user admin:', error);
      throw error;
    }
  },

  // User Management Functions for Admins
  async getAllUsersWithAuth() {
    try {
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting all users:', error);
        return [];
      }

      // Get auth data for each user
      const usersWithAuth = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
            return {
              ...profile,
              last_sign_in: authData?.user?.last_sign_in_at,
              email_confirmed: !!authData?.user?.email_confirmed_at,
              banned: false
            };
          } catch (error) {
            console.error('Error getting auth data for user:', profile.id, error);
            return {
              ...profile,
              last_sign_in: null,
              email_confirmed: false,
              banned: false
            };
          }
        })
      );

      return usersWithAuth;
    } catch (error) {
      console.error('Error getting all users with auth data:', error);
      return [];
    }
  },

  async updateUser(userId: string, updates: Partial<Profile>) {
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
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(userId: string) {
    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  async suspendUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ status: 'suspended' })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  },

  async activateUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ status: 'active' })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }
};

// Reports API (existing implementation)
export const reportsAPI = {
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

  async createVehicleAlert(alertData: any) {
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

  async updateVehicleAlert(id: string, updates: any) {
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

  async updateCrimeReport(id: string, updates: any) {
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
      const [vehiclesResult, crimesResult] = await Promise.allSettled([
        supabase.from('vehicle_alerts').select('*', { count: 'exact' }),
        supabase.from('crime_reports').select('*', { count: 'exact' })
      ]);

      const vehicles = vehiclesResult.status === 'fulfilled' ? vehiclesResult.value : { data: [], count: 0 };
      const crimes = crimesResult.status === 'fulfilled' ? crimesResult.value : { data: [], count: 0 };

      const today = new Date().toISOString().split('T')[0];
      
      const todayVehicles = vehicles.data?.filter(v => 
        v.created_at.split('T')[0] === today
      ).length || 0;

      const todayCrimes = crimes.data?.filter(c => 
        c.created_at.split('T')[0] === today
      ).length || 0;

      return {
        totalVehicles: vehicles.count || 0,
        todayVehicles,
        activeVehicles: vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0,
        resolvedVehicles: vehicles.data?.filter(v => v.status === 'resolved').length || 0,
        vehiclesWithLocation: vehicles.data?.filter(v => v.last_seen_location).length || 0,
        
        totalCrimes: crimes.count || 0,
        todayCrimes,
        activeCrimes: crimes.data?.filter(c => c.status === 'pending' || c.status === 'under_review').length || 0,
        resolvedCrimes: crimes.data?.filter(c => c.status === 'resolved').length || 0,
        crimesWithLocation: crimes.data?.filter(c => c.location).length || 0,

        totalReports: (vehicles.count || 0) + (crimes.count || 0),
        todayReports: todayVehicles + todayCrimes,
        activeReports: (vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0) + 
                      (crimes.data?.filter(c => c.status === 'pending' || c.status === 'under_review').length || 0),
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalVehicles: 0,
        todayVehicles: 0,
        activeVehicles: 0,
        resolvedVehicles: 0,
        vehiclesWithLocation: 0,
        
        totalCrimes: 0,
        todayCrimes: 0,
        activeCrimes: 0,
        resolvedCrimes: 0,
        crimesWithLocation: 0,

        totalReports: 0,
        todayReports: 0,
        activeReports: 0,
      };
    }
  }
};

// Export individual functions for backward compatibility
export const ensureUserExists = authAPI.createProfile;
export const getAllUsers = authAPI.getAllUsers;
export const updateUserRole = authAPI.updateUserRole;
export const makeUserAdmin = authAPI.makeUserAdmin;