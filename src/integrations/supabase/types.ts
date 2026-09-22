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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_pins: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      alley_dialogue: {
        Row: {
          created_at: string
          grade_band: string
          id: string
          room_id: string | null
          sort_order: number
          text: string
          trigger_context: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade_band?: string
          id?: string
          room_id?: string | null
          sort_order?: number
          text: string
          trigger_context: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade_band?: string
          id?: string
          room_id?: string | null
          sort_order?: number
          text?: string
          trigger_context?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alley_dialogue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "campus_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_buildings: {
        Row: {
          departments: Json
          description: string
          entrance_position: Json | null
          id: string
          interior_map_asset_url: string | null
          map_x: number
          map_y: number
          name: string
          zone_id: string
        }
        Insert: {
          departments?: Json
          description: string
          entrance_position?: Json | null
          id: string
          interior_map_asset_url?: string | null
          map_x?: number
          map_y?: number
          name: string
          zone_id: string
        }
        Update: {
          departments?: Json
          description?: string
          entrance_position?: Json | null
          id?: string
          interior_map_asset_url?: string | null
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
          door_position: Json | null
          faculty_character: string
          id: string
          kind: string
          lesson_id: string | null
          name: string
          sort_order: number
        }
        Insert: {
          building_id: string
          course_id?: string | null
          door_position?: Json | null
          faculty_character?: string
          id: string
          kind?: string
          lesson_id?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          building_id?: string
          course_id?: string | null
          door_position?: Json | null
          faculty_character?: string
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
          grade_band: string
          id: string
          map_asset_url: string | null
          name: string
          sort_order: number
          subject: string | null
        }
        Insert: {
          description: string
          grade_band?: string
          id: string
          map_asset_url?: string | null
          name: string
          sort_order?: number
          subject?: string | null
        }
        Update: {
          description?: string
          grade_band?: string
          id?: string
          map_asset_url?: string | null
          name?: string
          sort_order?: number
          subject?: string | null
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
      families: {
        Row: {
          created_at: string
          family_code: string
          family_name: string
          id: string
        }
        Insert: {
          created_at?: string
          family_code?: string
          family_name: string
          id?: string
        }
        Update: {
          created_at?: string
          family_code?: string
          family_name?: string
          id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          alley_greeting: string | null
          course_id: string
          curriculum_source: string
          grade: number | null
          id: string
          render_config: Json | null
          render_mode: string
          sections: Json
          sort_order: number
          standard_code: string | null
          subject: string | null
          summary: string
          title: string
        }
        Insert: {
          alley_greeting?: string | null
          course_id: string
          curriculum_source?: string
          grade?: number | null
          id: string
          render_config?: Json | null
          render_mode?: string
          sections?: Json
          sort_order?: number
          standard_code?: string | null
          subject?: string | null
          summary: string
          title: string
        }
        Update: {
          alley_greeting?: string | null
          course_id?: string
          curriculum_source?: string
          grade?: number | null
          id?: string
          render_config?: Json | null
          render_mode?: string
          sections?: Json
          sort_order?: number
          standard_code?: string | null
          subject?: string | null
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
          age: number | null
          avatar: string
          character_look: Json
          created_at: string
          display_name: string
          family_id: string | null
          family_role: string | null
          grade_band: string | null
          id: string
          interests: string[]
          learning_style: string | null
          mascot_accessory: string
          mascot_color: string
          portrait: Json
          setup_complete: boolean
        }
        Insert: {
          age?: number | null
          avatar?: string
          character_look?: Json
          created_at?: string
          display_name?: string
          family_id?: string | null
          family_role?: string | null
          grade_band?: string | null
          id: string
          interests?: string[]
          learning_style?: string | null
          mascot_accessory?: string
          mascot_color?: string
          portrait?: Json
          setup_complete?: boolean
        }
        Update: {
          age?: number | null
          avatar?: string
          character_look?: Json
          created_at?: string
          display_name?: string
          family_id?: string | null
          family_role?: string | null
          grade_band?: string | null
          id?: string
          interests?: string[]
          learning_style?: string | null
          mascot_accessory?: string
          mascot_color?: string
          portrait?: Json
          setup_complete?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
      student_awards: {
        Row: {
          coins: number
          created_at: string
          id: string
          kind: string
          label: string
          source_id: string | null
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          id?: string
          kind: string
          label: string
          source_id?: string | null
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          source_id?: string | null
          user_id?: string
          xp?: number
        }
        Relationships: []
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
      student_inventory: {
        Row: {
          acquired_at: string
          created_at: string
          id: string
          item_id: string
          quantity: number
          source: string
          updated_at: string
          used_count: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          source?: string
          updated_at?: string
          used_count?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          source?: string
          updated_at?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          last_position: Json | null
          lesson_id: string
          score: number | null
          sections_read: number
          status: string
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          last_position?: Json | null
          lesson_id: string
          score?: number | null
          sections_read?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          last_position?: Json | null
          lesson_id?: string
          score?: number | null
          sections_read?: number
          status?: string
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_progression: {
        Row: {
          coins: number
          created_at: string
          level: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          coins?: number
          created_at?: string
          level?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          coins?: number
          created_at?: string
          level?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      student_quests: {
        Row: {
          accepted_at: string
          completed_at: string | null
          created_at: string
          id: string
          quest_id: string
          status: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          quest_id: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          quest_id?: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_family: { Args: { _family_name: string }; Returns: string }
      generate_family_code: { Args: never; Returns: string }
      join_family: {
        Args: { _family_code: string; _role?: string }
        Returns: string
      }
      verify_admin_pin: { Args: { _pin: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
