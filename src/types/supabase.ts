export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          approved: boolean
          role: 'user' | 'moderator' | 'admin'
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          approved?: boolean
          role?: 'user' | 'moderator' | 'admin'
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          approved?: boolean
          role?: 'user' | 'moderator' | 'admin'
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          ip_address: string
          user_agent: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          ip_address?: string
          user_agent?: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          ip_address?: string
          user_agent?: string
          details?: Json
          created_at?: string
        }
      }
      presence: {
        Row: {
          id: string
          user_id: string
          last_seen: string
          online: boolean
        }
        Insert: {
          id?: string
          user_id: string
          last_seen?: string
          online?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          last_seen?: string
          online?: boolean
        }
      }
      alerts_vehicles: {
        Row: {
          id: string
          user_id: string
          number_plate: string
          color: string
          make: string
          model: string
          reason: string
          case_number: string | null
          station_reported_at: string | null
          ob_number: string
          suburb: string
          comments: string | null
          has_images: boolean
          image_urls: string[] | null
          latitude: number | null
          longitude: number | null
          incident_date: string | null
          status: 'ACTIVE' | 'RECOVERED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          number_plate: string
          color: string
          make: string
          model: string
          reason: string
          case_number?: string | null
          station_reported_at?: string | null
          ob_number: string
          suburb: string
          comments?: string | null
          has_images?: boolean
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          incident_date?: string | null
          status?: 'ACTIVE' | 'RECOVERED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          number_plate?: string
          color?: string
          make?: string
          model?: string
          reason?: string
          case_number?: string | null
          station_reported_at?: string | null
          ob_number?: string
          suburb?: string
          comments?: string | null
          has_images?: boolean
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          incident_date?: string | null
          status?: 'ACTIVE' | 'RECOVERED'
          created_at?: string
          updated_at?: string
        }
      }
      crime_reports: {
        Row: {
          id: string
          user_id: string
          crime_type: string
          description: string
          location: string
          suburb: string
          date_occurred: string | null
          time_occurred: string | null
          suspects_description: string | null
          weapons_involved: boolean
          injuries: boolean
          case_number: string | null
          station_reported_at: string | null
          ob_number: string
          comments: string | null
          has_images: boolean
          image_urls: string[] | null
          latitude: number | null
          longitude: number | null
          status: 'ACTIVE' | 'RECOVERED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          crime_type: string
          description: string
          location: string
          suburb: string
          date_occurred?: string | null
          time_occurred?: string | null
          suspects_description?: string | null
          weapons_involved?: boolean
          injuries?: boolean
          case_number?: string | null
          station_reported_at?: string | null
          ob_number: string
          comments?: string | null
          has_images?: boolean
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          status?: 'ACTIVE' | 'RECOVERED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          crime_type?: string
          description?: string
          location?: string
          suburb?: string
          date_occurred?: string | null
          time_occurred?: string | null
          suspects_description?: string | null
          weapons_involved?: boolean
          injuries?: boolean
          case_number?: string | null
          station_reported_at?: string | null
          ob_number?: string
          comments?: string | null
          has_images?: boolean
          image_urls?: string[] | null
          latitude?: number | null
          longitude?: number | null
          status?: 'ACTIVE' | 'RECOVERED'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}