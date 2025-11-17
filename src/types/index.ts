// types/index.ts
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
  id: string
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
  user_id: string
  status: 'ACTIVE' | 'RECOVERED'
  users: {
    name: string
    email: string
  }
}

export interface Alert {
  id: string;
  // Add other alert properties as needed
}