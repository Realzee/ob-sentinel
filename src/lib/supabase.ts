// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Types
export type ReportStatus = 'active' | 'pending' | 'resolved' | 'rejected' | 'recovered';
export type UserRole = 'admin' | 'moderator' | 'controller' | 'user';
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
  // Get all companies (admin only)
  getAllCompanies: async (): Promise<Company[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('🔍 Fetching companies from API...');
    const response = await fetch('/api/admin/companies', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Companies API error:', response.status, errorText);
      
      // Fallback: Try direct database query
      console.log('🔄 Trying fallback database query...');
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Fallback also failed:', error);
        throw new Error(`API: HTTP ${response.status}, DB: ${error.message}`);
      }
      
      console.log('✅ Fallback successful, companies:', data?.length || 0);
      return data || [];
    }

    const data = await response.json();
    console.log('✅ Companies API successful, companies:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('💥 Error fetching companies:', error);
    
    // Ultimate fallback - return empty array
    console.log('🔄 Using ultimate fallback - empty array');
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

  // Create company
  createCompany: async (companyData: { name: string; created_by: string }): Promise<Company> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  },

  // Update company
  updateCompany: async (companyId: string, updates: Partial<Company>): Promise<Company> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  },

  // Delete company
  deleteCompany: async (companyId: string): Promise<void> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
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
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('🔍 Assigning user to company:', { userId, companyId });
    
    // Try different endpoint formats
    let response;
    try {
      response = await fetch(`/api/admin/users/${userId}/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ company_id: companyId }),
      });
    } catch (firstError) {
      console.log('🔄 First endpoint failed, trying alternative...');
      // Try alternative endpoint
      response = await fetch(`/api/admin/users/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, company_id: companyId }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error assigning user to company:', response.status, errorText);
      
      // Fallback to direct database update
      console.log('🔄 Using fallback database update...');
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          company_id: companyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Fallback also failed:', error);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log('✅ Fallback successful');
      return true;
    }

    const data = await response.json();
    return data.success || true;
  } catch (error) {
    console.error('Error assigning user to company:', error);
    throw error;
  }
}
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
  }
};

// Auth API with company support
export const authAPI = {
  // Get all users (admin sees all, moderators see only their company users)
  // Get all users (admin sees all, moderators see only their company users)
getAllUsers: async (currentUserRole?: UserRole, currentUserCompanyId?: string): Promise<AuthUser[]> => {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch('/api/admin/users/', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // First check the response status
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Users API error:', response.status, errorText);
      
      // Try to parse error as JSON
      try {
        const errorData = JSON.parse(errorText);
        console.error('❌ Users API error details:', errorData);
      } catch {
        // Not JSON, use raw text
      }
      
      // Return empty array instead of throwing
      return [];
    }
    
    // Get response text first to see what we're getting
    const responseText = await response.text();
    console.log('🔍 Users API raw response:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse API response as JSON:', parseError);
      return [];
    }
    
    // Check if data has the expected format
    if (!data || typeof data !== 'object') {
      console.error('❌ Users API returned non-object data:', data);
      return [];
    }
    
    // Check if it's an error object
    if (data.error || data.message) {
      console.error('❌ Users API returned error object:', data);
      return [];
    }
    
    // Check if data is an array, or if it has a data property that's an array
    let usersArray: AuthUser[] = [];
    
    if (Array.isArray(data)) {
      usersArray = data;
    } else if (data.data && Array.isArray(data.data)) {
      usersArray = data.data;
    } else if (data.users && Array.isArray(data.users)) {
      usersArray = data.users;
    } else {
      console.error('❌ Users API returned unexpected data format:', data);
      return [];
    }
    
    // Filter users by company for moderators
    let filteredData = usersArray;
    if (currentUserRole === 'moderator' && currentUserCompanyId) {
      filteredData = usersArray.filter((user: AuthUser) => user.company_id === currentUserCompanyId);
    }
    
    console.log('✅ Users API successful, returning:', filteredData.length, 'users');
    return filteredData;
  } catch (error) {
    console.error('💥 Error fetching users:', error);
    // Return empty array instead of throwing
    return [];
  }
},
  // Update user role
  updateUserRole: async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  // Create user with company assignment
  createUser: async (userData: {
    email: string;
    password: string;
    full_name?: string;
    role?: UserRole;
    company_id?: string;
  }): Promise<any> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  // Delete user (permanent deletion - admin only)
  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.success;
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
  },

  // Assign user to company
  assignUserToCompany: async (userId: string, companyId: string): Promise<boolean> => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/admin/users/${userId}/company`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error assigning user to company:', error);
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

// Export everything
export default supabase;