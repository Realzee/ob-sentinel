// lib/supabase/reports.ts
import { supabase } from './client';

export const reportsAPI = {
  // Vehicle Alerts
  getVehicleAlerts: async () => {
    const { data, error } = await supabase
      .from('vehicle_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createVehicleAlert: async (alertData: any) => {
    const { data, error } = await supabase
      .from('vehicle_alerts')
      .insert([
        {
          ...alertData,
          status: alertData.status || 'pending',
          severity: alertData.severity || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateVehicleAlert: async (id: string, updates: any) => {
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
  },

  deleteVehicleAlert: async (id: string) => {
    const { error } = await supabase
      .from('vehicle_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Crime Reports
  getCrimeReports: async () => {
    const { data, error } = await supabase
      .from('crime_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createCrimeReport: async (reportData: any) => {
    const { data, error } = await supabase
      .from('crime_reports')
      .insert([
        {
          ...reportData,
          status: reportData.status || 'pending',
          severity: reportData.severity || 'medium',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateCrimeReport: async (id: string, updates: any) => {
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
  },

  deleteCrimeReport: async (id: string) => {
    const { error } = await supabase
      .from('crime_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    try {
      const [vehiclesResult, crimesResult, todayVehicles, todayCrimes] = await Promise.all([
        supabase
          .from('vehicle_alerts')
          .select('id', { count: 'exact' })
          .in('status', ['active', 'pending']),
        
        supabase
          .from('crime_reports')
          .select('id', { count: 'exact' })
          .in('status', ['active', 'pending']),
        
        supabase
          .from('vehicle_alerts')
          .select('id', { count: 'exact' })
          .gte('created_at', new Date().toISOString().split('T')[0]),
        
        supabase
          .from('crime_reports')
          .select('id', { count: 'exact' })
          .gte('created_at', new Date().toISOString().split('T')[0])
      ]);

      return {
        activeReports: (vehiclesResult.count || 0) + (crimesResult.count || 0),
        todayReports: (todayVehicles.count || 0) + (todayCrimes.count || 0),
        vehicleAlerts: vehiclesResult.count || 0,
        crimeReports: crimesResult.count || 0
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        activeReports: 0,
        todayReports: 0,
        vehicleAlerts: 0,
        crimeReports: 0
      };
    }
  }
};