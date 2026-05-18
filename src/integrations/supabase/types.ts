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
      case_packs: {
        Row: {
          category: string | null
          id: string
          season_name: string
        }
        Insert: {
          category?: string | null
          id?: string
          season_name: string
        }
        Update: {
          category?: string | null
          id?: string
          season_name?: string
        }
        Relationships: []
      }
      case_templates: {
        Row: {
          description: string
          id: string
          pack_id: string
          suggested_sentence: string | null
          title: string
        }
        Insert: {
          description: string
          id?: string
          pack_id: string
          suggested_sentence?: string | null
          title: string
        }
        Update: {
          description?: string
          id?: string
          pack_id?: string
          suggested_sentence?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_templates_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "case_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          id: string
          player_id: string
          round_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          round_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          round_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      instant_trials: {
        Row: {
          accused_name: string
          best_evidence_id: string | null
          closes_at: string
          created_at: string
          creator_browser_token: string
          crime_text: string
          id: string
          result: string | null
          slug: string
          status: string
          suggested_sentence: string | null
          verdict_sentence: string | null
        }
        Insert: {
          accused_name: string
          best_evidence_id?: string | null
          closes_at: string
          created_at?: string
          creator_browser_token: string
          crime_text: string
          id?: string
          result?: string | null
          slug: string
          status?: string
          suggested_sentence?: string | null
          verdict_sentence?: string | null
        }
        Update: {
          accused_name?: string
          best_evidence_id?: string | null
          closes_at?: string
          created_at?: string
          creator_browser_token?: string
          crime_text?: string
          id?: string
          result?: string | null
          slug?: string
          status?: string
          suggested_sentence?: string | null
          verdict_sentence?: string | null
        }
        Relationships: []
      }
      instant_votes: {
        Row: {
          browser_token: string
          created_at: string
          evidence_text: string | null
          id: string
          trial_id: string
          vote: string
          voter_nickname: string
        }
        Insert: {
          browser_token: string
          created_at?: string
          evidence_text?: string | null
          id?: string
          trial_id: string
          vote: string
          voter_nickname: string
        }
        Update: {
          browser_token?: string
          created_at?: string
          evidence_text?: string | null
          id?: string
          trial_id?: string
          vote?: string
          voter_nickname?: string
        }
        Relationships: [
          {
            foreignKeyName: "instant_votes_trial_id_fkey"
            columns: ["trial_id"]
            isOneToOne: false
            referencedRelation: "instant_trials"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string
          browser_token: string
          id: string
          joined_at: string
          nickname: string
          room_id: string
        }
        Insert: {
          avatar: string
          browser_token: string
          id?: string
          joined_at?: string
          nickname: string
          room_id: string
        }
        Update: {
          avatar?: string
          browser_token?: string
          id?: string
          joined_at?: string
          nickname?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          current_round_id: string | null
          host_browser_token: string
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_round_id?: string | null
          host_browser_token: string
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_round_id?: string | null
          host_browser_token?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      rounds: {
        Row: {
          accused_player_id: string | null
          case_template_id: string | null
          case_type: string
          chaos_lawyer_player_id: string | null
          created_at: string
          custom_description: string | null
          custom_title: string | null
          ends_at: string | null
          id: string
          phase: string
          room_id: string
          suggested_sentence: string | null
        }
        Insert: {
          accused_player_id?: string | null
          case_template_id?: string | null
          case_type: string
          chaos_lawyer_player_id?: string | null
          created_at?: string
          custom_description?: string | null
          custom_title?: string | null
          ends_at?: string | null
          id?: string
          phase?: string
          room_id: string
          suggested_sentence?: string | null
        }
        Update: {
          accused_player_id?: string | null
          case_template_id?: string | null
          case_type?: string
          chaos_lawyer_player_id?: string | null
          created_at?: string
          custom_description?: string | null
          custom_title?: string | null
          ends_at?: string | null
          id?: string
          phase?: string
          room_id?: string
          suggested_sentence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_accused_player_id_fkey"
            columns: ["accused_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_case_template_id_fkey"
            columns: ["case_template_id"]
            isOneToOne: false
            referencedRelation: "case_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_chaos_lawyer_player_id_fkey"
            columns: ["chaos_lawyer_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      verdicts: {
        Row: {
          best_evidence_id: string | null
          chaos_lawyer_found: boolean | null
          created_at: string
          id: string
          instant_trial_id: string | null
          result: string
          round_id: string | null
          sentence: string | null
        }
        Insert: {
          best_evidence_id?: string | null
          chaos_lawyer_found?: boolean | null
          created_at?: string
          id?: string
          instant_trial_id?: string | null
          result: string
          round_id?: string | null
          sentence?: string | null
        }
        Update: {
          best_evidence_id?: string | null
          chaos_lawyer_found?: boolean | null
          created_at?: string
          id?: string
          instant_trial_id?: string | null
          result?: string
          round_id?: string | null
          sentence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verdicts_instant_trial_id_fkey"
            columns: ["instant_trial_id"]
            isOneToOne: false
            referencedRelation: "instant_trials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verdicts_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          chaos_guess_player_id: string | null
          created_at: string
          id: string
          player_id: string
          round_id: string
          vote: string
        }
        Insert: {
          chaos_guess_player_id?: string | null
          created_at?: string
          id?: string
          player_id: string
          round_id: string
          vote: string
        }
        Update: {
          chaos_guess_player_id?: string | null
          created_at?: string
          id?: string
          player_id?: string
          round_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_chaos_guess_player_id_fkey"
            columns: ["chaos_guess_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
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
