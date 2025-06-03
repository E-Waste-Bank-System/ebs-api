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
      articles: {
        Row: {
          id: string
          title: string
          content: string
          image_url: string | null
          slug: string
          author_id: string
          status: 'draft' | 'published' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          image_url?: string | null
          slug: string
          author_id: string
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          image_url?: string | null
          slug?: string
          author_id?: string
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      objects: {
        Row: {
          id: string
          user_id: string
          scan_id: string
          image_url: string
          category: string
          confidence: number
          regression_result: number | null
          description: string | null
          suggestion: string[]
          risk_lvl: number | null
          detection_source: string
          is_validated: boolean
          validated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scan_id: string
          image_url: string
          category: string
          confidence: number
          regression_result?: number | null
          description?: string | null
          suggestion: string[]
          risk_lvl?: number | null
          detection_source: string
          is_validated?: boolean
          validated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scan_id?: string
          image_url?: string
          category?: string
          confidence?: number
          regression_result?: number | null
          description?: string | null
          suggestion?: string[]
          risk_lvl?: number | null
          detection_source?: string
          is_validated?: boolean
          validated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ewaste: {
        Row: {
          id: string
          user_id: string
          object_id: string
          category: string
          quantity: number
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          object_id: string
          category: string
          quantity: number
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          object_id?: string
          category?: string
          quantity?: number
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      retraining_data: {
        Row: {
          id: string
          user_id: string
          object_id: string
          image_url: string
          original_category: string
          bbox_coordinates: Json
          confidence_score: number
          corrected_category: string | null
          corrected_price: number | null
          is_verified: boolean
          verified_by: string | null
          model_version: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          object_id: string
          image_url: string
          original_category: string
          bbox_coordinates: Json
          confidence_score: number
          corrected_category?: string | null
          corrected_price?: number | null
          is_verified?: boolean
          verified_by?: string | null
          model_version: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          object_id?: string
          image_url?: string
          original_category?: string
          bbox_coordinates?: Json
          confidence_score?: number
          corrected_category?: string | null
          corrected_price?: number | null
          is_verified?: boolean
          verified_by?: string | null
          model_version?: string
          created_at?: string
          updated_at?: string
        }
      }
      validation_history: {
        Row: {
          id: string
          object_id: string
          user_id: string
          action: 'verify' | 'reject' | 'modify'
          previous_category: string | null
          new_category: string | null
          previous_confidence: number | null
          new_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          object_id: string
          user_id: string
          action: 'verify' | 'reject' | 'modify'
          previous_category?: string | null
          new_category?: string | null
          previous_confidence?: number | null
          new_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          object_id?: string
          user_id?: string
          action?: 'verify' | 'reject' | 'modify'
          previous_category?: string | null
          new_category?: string | null
          previous_confidence?: number | null
          new_confidence?: number | null
          created_at?: string
        }
      }
      model_versions: {
        Row: {
          id: string
          version: string
          description: string | null
          performance_metrics: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          version: string
          description?: string | null
          performance_metrics?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          version?: string
          description?: string | null
          performance_metrics?: Json | null
          is_active?: boolean
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