export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      campus_buildings: {
        Row: {
          departments: Json
          description: string
          id: string
          map_x: number
          map_y: number
          name: string
          zone_id: string
        }
        Insert: {
          departments?: Json
          description: string
          id: string
          map_x?: number
          map_y?: number
          name: string
          zone_id: string
        }
        Update: {
          departments?: Json
          description?: string
          id?: string
          map_x?: number
          map_y?: number
          name?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_buildings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "campus_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_npcs: {
        Row: {
          behavior: string
          greeting: string
          id: string
          name: string
          role: string
          room_id: string | null
          zone_id: string | null
        }
        Insert: {
          behavior?: string
          greeting: string
          id: string
          name: string
          role: string
          room_id?: string | null
          zone_id?: string | null
        }
        Update: {
          behavior?: string
          greeting?: string
          id?: string
          name?: string
          role?: string
          room_id?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      campus_objectives: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          objective_key: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          objective_key: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          objective_key?: string
          user_id?: string
        }
        Relationships: []
      }
      campus_rooms: {
        Row: {
          building_id: string
          course_id: string | null
          id: string
          kind: string
          lesson_id: string | null
          name: string
          sort_order: number
        }
        Insert: {
          building_id: string
          course_id?: string | null
          id: string
          kind?: string
          lesson_id?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          building_id?: string
          course_id?: string | null
          id?: string
          kind?: string
          lesson_id?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campus_rooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "campus_buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_rooms_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_rooms_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_zones: {
        Row: {
          description: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          description: string
          id: string
          name: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          description: string
          id: string
          sort_order: number
          subject: string
          title: string
        }
        Insert: {
          description: string
          id: string
          sort_order?: number
          subject: string
          title: string
        }
        Update: {
          description?: string
          id?: string
          sort_order?: number
          subject?: string
          title?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          alley_greeting: string | null
          course_id: string
          id: string
          render_mode: string
          sections: Json
          sort_order: number
          summary: string
          title: string
        }
        Insert: {
          alley_greeting?: string | null
          course_id: string
          id: string
          render_mode?: string
          sections?: Json
          sort_order?: number
          summary: string
          title: string
        }
        Update: {
          alley_greeting?: string | null
          course_id?: string
          id?: string
          render_mode?: string
          sections?: Json
          sort_order?: number
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          choices: Json
          explanation: string
          id: string
          kind: string
          lesson_id: string
          prompt: string
          sort_order: number
        }
        Insert: {
          answer: string
          choices: Json
          explanation: string
          id: string
          kind: string
          lesson_id: string
          prompt: string
          sort_order?: number
        }
        Update: {
          answer?: string
          choices?: Json
          explanation?: string
          id?: string
          kind?: string
          lesson_id?: string
          prompt?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      student_campus_discoveries: {
        Row: {
          discovered_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          discovered_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          discovered_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          course_id: string
          id: string
          lesson_id: string
          score: number | null
          sections_read: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          lesson_id: string
          score?: number | null
          sections_read?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          lesson_id?: string
          score?: number | null
          sections_read?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
