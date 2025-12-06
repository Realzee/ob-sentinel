// lib/rbac.ts
import { UserRole } from './supabase';

export interface PermissionSet {
  // Dashboard Access
  canViewDashboard: boolean;
  canCreateReports: boolean;
  canViewReports: boolean;
  canEditReports: boolean;
  canDeleteReports: boolean;
  
  // User Management
  canViewUserManagement: boolean;
  canManageUsers: boolean;
  canEditUserRoles: boolean;
  canDeleteUsers: boolean;
  
  // Company Management
  canViewCompanyManagement: boolean;
  canManageCompanies: boolean;
  
  // Control Room
  canViewControlRoom: boolean;
  canDispatchResponders: boolean;
  canUpdateReportStatus: boolean;
  
  // Responder Features
  canViewAssignedReports: boolean;
  canUpdateReportOnScene: boolean;
  canMarkReportResolved: boolean;
  canViewSceneNavigation: boolean;
}

export const getPermissions = (role: UserRole, userCompanyId?: string): PermissionSet => {
  const basePermissions: PermissionSet = {
    canViewDashboard: false,
    canCreateReports: false,
    canViewReports: false,
    canEditReports: false,
    canDeleteReports: false,
    canViewUserManagement: false,
    canManageUsers: false,
    canEditUserRoles: false,
    canDeleteUsers: false,
    canViewCompanyManagement: false,
    canManageCompanies: false,
    canViewControlRoom: false,
    canDispatchResponders: false,
    canUpdateReportStatus: false,
    canViewAssignedReports: false,
    canUpdateReportOnScene: false,
    canMarkReportResolved: false,
    canViewSceneNavigation: false,
  };

  switch (role) {
    case 'admin':
      return {
        ...basePermissions,
        canViewDashboard: true,
        canCreateReports: true,
        canViewReports: true,
        canEditReports: true,
        canDeleteReports: true,
        canViewUserManagement: true,
        canManageUsers: true,
        canEditUserRoles: true,
        canDeleteUsers: true,
        canViewCompanyManagement: true,
        canManageCompanies: true,
        canViewControlRoom: true,
        canDispatchResponders: true,
        canUpdateReportStatus: true,
      };

    case 'moderator':
      return {
        ...basePermissions,
        canViewDashboard: true,
        canCreateReports: true,
        canViewReports: true, // Only from their company
        canEditReports: true, // Only from their company
        canDeleteReports: true, // Only from their company
        canViewUserManagement: true, // Only users from their company
        canManageUsers: true, // Only users from their company
        canEditUserRoles: true, // Only within their company
        canDeleteUsers: false, // Cannot delete users
        canViewCompanyManagement: false,
        canManageCompanies: false,
        canViewControlRoom: true, // Company-specific
        canDispatchResponders: true, // Within company
        canUpdateReportStatus: true, // Within company
      };

    case 'controller':
      return {
        ...basePermissions,
        canViewDashboard: false,
        canCreateReports: false,
        canViewReports: true, // Only from their company
        canEditReports: true, // Only status updates
        canDeleteReports: false,
        canViewUserManagement: false,
        canManageUsers: false,
        canEditUserRoles: false,
        canDeleteUsers: false,
        canViewCompanyManagement: false,
        canManageCompanies: false,
        canViewControlRoom: true, // Main role
        canDispatchResponders: true, // Primary function
        canUpdateReportStatus: true, // Primary function        
      };

    case 'responder':
      return {
        ...basePermissions,
        canViewDashboard: true,
        canCreateReports: false,
        canViewReports: true, // Only assigned reports
        canEditReports: true, // Only status updates
        canDeleteReports: false,
        canViewUserManagement: false,
        canManageUsers: false,
        canEditUserRoles: false,
        canDeleteUsers: false,
        canViewCompanyManagement: false,
        canManageCompanies: false,
        canViewControlRoom: false,
        canDispatchResponders: false,
        canUpdateReportStatus: true, // Only for assigned reports
        canViewAssignedReports: true,
        canUpdateReportOnScene: true,
        canMarkReportResolved: true,
        canViewSceneNavigation: true, // OpenStreetMaps integration
      };

    case 'user':
    default:
      return {
        ...basePermissions,
        canViewDashboard: true,
        canCreateReports: true,
        canViewReports: true, // Only their own
        canEditReports: true, // Only their own
        canDeleteReports: true, // Only their own
        canViewUserManagement: false,
        canManageUsers: false,
        canEditUserRoles: false,
        canDeleteUsers: false,
        canViewCompanyManagement: false,
        canManageCompanies: false,
        canViewControlRoom: false,
        canDispatchResponders: false,
        canUpdateReportStatus: false,
      };
  }
};

// Helper to check if user can access a specific route
export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const permissions = getPermissions(role);
  
  switch (route) {
    case '/dashboard':
      return permissions.canViewDashboard;
    case '/control-room':
      return permissions.canViewControlRoom;
    case '/admin/users':
      return permissions.canViewUserManagement;
    case '/admin/companies':
      return permissions.canViewCompanyManagement;
    case '/responder':
      return role === 'responder';
    default:
      return true;
  }
};