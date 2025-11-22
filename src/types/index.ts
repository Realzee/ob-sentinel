// types/index.ts

// Base types that match your actual data structure
export type UserRole = 'ADMIN' | 'USER' | 'OFFICER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type ReportStatus = 'pending' | 'resolved' | 'rejected' | 'ACTIVE' | 'RECOVERED';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export interface AlertVehicle {
  id: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  year?: number;
  reason: string;
  last_seen_location?: string;
  last_seen_time?: string;
  severity: SeverityType;
  notes?: string;
  evidence_images?: string[];
  reported_by: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  // Additional fields that might be present
  number_plate?: string;
  make?: string;
  model?: string;
  color?: string;
  case_number?: string;
  station_reported_at?: string;
  ob_number?: string;
  suburb?: string;
  has_images?: boolean;
  image_urls?: string[];
  latitude?: number;
  longitude?: number;
  incident_date?: string;
  user_id?: string;
  comments?: string;
  users?: {
    name: string;
    email: string;
  };
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
  // Additional fields that might be present
  crime_type?: string;
  date_occurred?: string;
  time_occurred?: string;
  suspects_description?: string;
  weapons_involved?: boolean;
  injuries?: boolean;
  case_number?: string;
  station_reported_at?: string;
  ob_number?: string;
  has_images?: boolean;
  image_urls?: string[];
  latitude?: number;
  longitude?: number;
  user_id?: string;
  comments?: string;
  users?: {
    name: string;
    email: string;
  };
}

export interface Alert {
  id: string;
  // Add other alert properties as needed
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}