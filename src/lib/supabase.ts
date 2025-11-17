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

// Auth API - SIMPLIFIED
export const authAPI = {
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
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
      .from('profiles')
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

  async makeUserAdmin(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
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
  async getVehicleAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
        .select('*, profiles:reported_by(full_name, email)')
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

  async getDashboardStats() {
    try {
      const vehicles = await supabase.from('alerts_vehicles').select('*', { count: 'exact' });

      const today = new Date().toISOString().split('T')[0];
      const todayVehicles = vehicles.data?.filter(v => 
        v.created_at.split('T')[0] === today
      ).length || 0;

      return {
        totalVehicles: vehicles.count || 0,
        todayVehicles,
        activeVehicles: vehicles.data?.filter(v => v.status === 'pending' || v.status === 'under_review').length || 0,
        resolvedVehicles: vehicles.data?.filter(v => v.status === 'resolved').length || 0,
        vehiclesWithLocation: vehicles.data?.filter(v => v.last_seen_location).length || 0,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalVehicles: 0,
        todayVehicles: 0,
        activeVehicles: 0,
        resolvedVehicles: 0,
        vehiclesWithLocation: 0,
      };
    }
  }
};