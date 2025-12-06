// lib/api-client.ts
import { authAPI as originalAuthAPI, AuthUser, UserRole } from './supabase';

// Create a wrapper that includes the missing methods
export const authAPI = {
  ...originalAuthAPI,
  
  // Add missing methods with proper typing
  getAllUsers: async (currentUserRole?: UserRole, currentUserCompanyId?: string): Promise<AuthUser[]> => {
    return originalAuthAPI.getAllUsers(currentUserRole, currentUserCompanyId);
  },
  
  createUser: async (userData: any) => {
    return await originalAuthAPI.createUser(userData);
  },
  
  updateUserRole: async (userId: string, role: UserRole) => {
    return await originalAuthAPI.updateUserRole(userId, role);
  },
  
  updateUserStatus: async (userId: string, status: any) => {
    return await originalAuthAPI.updateUserStatus(userId, status);
  },
  
  deleteUser: async (userId: string) => {
    return await originalAuthAPI.deleteUser(userId);
  },
  
  assignUserToCompany: async (userId: string, companyId?: string | null) => {
    // Handle the undefined/null case
    return await originalAuthAPI.assignUserToCompany(userId, companyId || null);
  },
  
  // Add other methods as needed
  getRespondersByCompany: async (companyId: string) => {
    // This method should be in your original authAPI
    // For now, return empty array
    return [];
  },
  
  updateCurrentUserProfile: async (updates: any) => {
    return await originalAuthAPI.updateCurrentUserProfile(updates);
  }
};

// Export types
export type { AuthUser, UserRole } from './supabase';
export type ExtendedAuthUser = AuthUser & {
  // Add any extended properties here
};