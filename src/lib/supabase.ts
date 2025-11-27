// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Types
export type ReportStatus = 'active' | 'pending' | 'resolved' | 'rejected' | 'recovered';
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
export type UserStatus = 'active' | 'pending' | 'suspended';

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
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    role?: UserRole;
  };
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  role: UserRole;
  status: UserStatus;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

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

// Reports API
export const reportsAPI = {
  // Vehicle Reports
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

  getVehicleAlerts: async (): Promise<VehicleAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .order('created_at', { ascending: false });

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

  // Crime Reports
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

  getCrimeReports: async (): Promise<CrimeReport[]> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false });

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

  // Dashboard Stats
  getDashboardStats: async (): Promise<any> => {
    try {
      const [vehiclesData, crimesData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports()
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

  // Search and Filter
  searchVehicleAlerts: async (query: string): Promise<VehicleAlert[]> => {
    try {
      const { data, error } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .or(`license_plate.ilike.%${query}%,vehicle_make.ilike.%${query}%,vehicle_model.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching vehicle alerts:', error);
      return [];
    }
  },

  searchCrimeReports: async (query: string): Promise<CrimeReport[]> => {
    try {
      const { data, error } = await supabase
        .from('crime_reports')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching crime reports:', error);
      return [];
    }
  }
};

// Auth API
export const authAPI = {
  // Get all users (requires service role key via API route)
  getAllUsers: async (): Promise<AuthUser[]> => {
    try {
      const response = await fetch('/api/admin/users/');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Update user role
  updateUserRole: async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (userId: string, newStatus: UserStatus): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  },

  // Create user
  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
  }): Promise<any> => {
    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Delete user (suspend)
  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      // For safety, we'll just update status to suspended instead of deleting
      return await authAPI.updateUserStatus(userId, 'suspended');
    } catch (error) {
      console.error('Error deleting user:', error);
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
  }
};

// Export everything
export default supabase;