// types.ts
export interface AlertVehicle {
  id: string
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  station_reported_at: string
  ob_number: string
  suburb: string
  has_images: boolean
  image_urls?: string[]
  latitude?: number
  longitude?: number
  created_at: string
  incident_date?: string
  user_id: string
  comments?: string
  status: 'ACTIVE' | 'RECOVERED'
  users: {
    name: string
    email: string
  }
}

export interface CrimeReport {
  status: string
  id: string
  user_id: string
  crime_type: string
  description: string
  location: string
  suburb: string
  date_occurred?: string
  time_occurred?: string
  suspects_description?: string
  weapons_involved: boolean
  injuries: boolean
  case_number?: string
  station_reported_at?: string
  ob_number: string
  comments?: string
  has_images: boolean
  image_urls?: string[]
  latitude?: number
  longitude?: number
  created_at: string
  updated_at: string
  users?: {
    name: string
    email: string
  }
}

export interface User {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}

export interface UserLog {
  id: string
  user_id: string
  action: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface AlertFormData {
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  station_reported_at: string
  suburb: string
  comments: string
  latitude?: number
  longitude?: number
}

export interface CrimeFormData {
  crime_type: string
  description: string
  location: string
  suburb: string
  date_occurred: string
  time_occurred: string
  suspects_description: string
  weapons_involved: boolean
  injuries: boolean
  case_number: string
  station_reported_at: string
  comments: string
  latitude?: number
  longitude?: number
}

export interface Location {
  latitude: number
  longitude: number
  address?: string
}

// src/types/company.ts
export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at?: string;
  user_count?: number;
  subscription_plan?: string;
  contact_person?: string;
  website?: string;
}