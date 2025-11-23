// types/index.ts

// User Enums and Types
export type UserRole = 'ADMIN' | 'USER' | 'OFFICER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AlertStatus = 'ACTIVE' | 'RECOVERED' | 'ARCHIVED';

// Base Interfaces
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface UserInfo {
  name: string;
  email: string;
  id?: string;
}

export interface LocationData {
  suburb: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface MediaAttachments {
  has_images: boolean;
  image_urls?: string[];
  video_urls?: string[];
}

// Alert Vehicle Interface
export interface AlertVehicle extends BaseEntity, LocationData, MediaAttachments {
  number_plate: string;
  color: string;
  make: string;
  model: string;
  year?: number;
  reason: string;
  case_number: string;
  station_reported_at: string;
  ob_number: string;
  incident_date?: string;
  user_id: string;
  comments?: string;
  status: AlertStatus;
  users: UserInfo;
  last_seen_date?: string;
  is_stolen: boolean;
  insurance_details?: string;
}

// Crime Report Interface
export interface CrimeReport extends BaseEntity, LocationData, MediaAttachments {
  crime_type: string;
  description: string;
  location: string;
  date_occurred?: string;
  time_occurred?: string;
  suspects_description?: string;
  weapons_involved: boolean;
  weapons_description?: string;
  injuries: boolean;
  injury_details?: string;
  case_number?: string;
  station_reported_at?: string;
  ob_number: string;
  comments?: string;
  user_id: string;
  status: AlertStatus;
  users: UserInfo;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  witnesses?: string;
  evidence_details?: string;
}

// Alert Interface (Enhanced)
export interface Alert extends BaseEntity {
  type: 'VEHICLE' | 'CRIME' | 'GENERAL';
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: AlertStatus;
  location: LocationData;
  assigned_officer_id?: string;
  related_vehicle_id?: string;
  related_crime_report_id?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_by: string;
  updated_by?: string;
}

// User Profile Interface
export interface Profile extends BaseEntity {
  email: string;
  full_name: string | null;
  phone_number?: string;
  role: UserRole;
  status: UserStatus;
  last_sign_in_at: string | null;
  profile_image_url?: string;
  department?: string;
  badge_number?: string;
  notifications_enabled: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Search and Filter Types
export interface VehicleSearchFilters {
  number_plate?: string;
  make?: string;
  model?: string;
  color?: string;
  status?: AlertStatus;
  suburb?: string;
  date_from?: string;
  date_to?: string;
}

export interface CrimeReportFilters {
  crime_type?: string;
  suburb?: string;
  date_from?: string;
  date_to?: string;
  status?: AlertStatus;
  weapons_involved?: boolean;
  injuries?: boolean;
}

// Form Data Types
export interface CreateAlertVehicleData {
  number_plate: string;
  color: string;
  make: string;
  model: string;
  year?: number;
  reason: string;
  suburb: string;
  latitude?: number;
  longitude?: number;
  incident_date?: string;
  comments?: string;
  images?: File[];
}

export interface CreateCrimeReportData {
  crime_type: string;
  description: string;
  location: string;
  suburb: string;
  date_occurred?: string;
  time_occurred?: string;
  suspects_description?: string;
  weapons_involved: boolean;
  weapons_description?: string;
  injuries: boolean;
  injury_details?: string;
  latitude?: number;
  longitude?: number;
  comments?: string;
  images?: File[];
}

// Statistics Types
export interface DashboardStats {
  total_alerts: number;
  active_alerts: number;
  recovered_alerts: number;
  total_crime_reports: number;
  active_crime_reports: number;
  users_count: number;
  recent_activity: (AlertVehicle | CrimeReport)[];
}

export interface CrimeStatistics {
  crime_type: string;
  count: number;
  percentage: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'ALERT' | 'CRIME_REPORT' | 'SYSTEM' | 'USER';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_entity_id?: string;
  related_entity_type?: 'VEHICLE' | 'CRIME_REPORT' | 'USER';
}