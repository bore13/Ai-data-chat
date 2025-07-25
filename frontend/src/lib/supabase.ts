import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Debug: Log the environment variables
console.log('VITE_SUPABASE_URL:', supabaseUrl)
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET')

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string | null
          company: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      data_sources: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          config_json: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          config_json: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          config_json?: any
          created_at?: string
        }
      }
      uploaded_csv_data: {
        Row: {
          id: string
          data_source_id: string
          original_filename: string
          data_json: any
          uploaded_at: string
        }
        Insert: {
          id?: string
          data_source_id: string
          original_filename: string
          data_json: any
          uploaded_at?: string
        }
        Update: {
          id?: string
          data_source_id?: string
          original_filename?: string
          data_json?: any
          uploaded_at?: string
        }
      }
    }
  }
} 