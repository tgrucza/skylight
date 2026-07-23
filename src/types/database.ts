/**
 * Hand-written mirror of supabase/schema.sql, in the shape @supabase/supabase-js
 * expects for `createClient<Database>()`. Regenerate by hand alongside any
 * schema migration — see §7.4: migrations only, never edit applied ones.
 */

export type MemberRole = "adult" | "child";
export type CalendarSource = "hearth" | "google";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type ListKind = "grocery" | "checklist";
export type NotificationKind = "chore_due" | "event_reminder" | "list_note" | "system";
export type HubView = "busy" | "calm";

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          theme: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["families"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["families"]["Row"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & { email: string };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string | null;
          name: string;
          role: MemberRole;
          color_hex: string;
          avatar_url: string | null;
          pin_hash: string | null;
          invite_email: string | null;
          birthday: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["family_members"]["Row"]> & {
          family_id: string;
          name: string;
          role: MemberRole;
          color_hex: string;
        };
        Update: Partial<Database["public"]["Tables"]["family_members"]["Row"]>;
        Relationships: [];
      };
      calendar_integrations: {
        Row: {
          id: string;
          family_id: string;
          member_id: string;
          provider: string;
          google_calendar_id: string;
          access_token_enc: string;
          refresh_token_enc: string;
          sync_token: string | null;
          watch_channel_id: string | null;
          watch_expires_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["calendar_integrations"]["Row"]> & {
          family_id: string;
          member_id: string;
          google_calendar_id: string;
          access_token_enc: string;
          refresh_token_enc: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_integrations"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          family_id: string;
          member_id: string | null;
          integration_id: string | null;
          google_event_id: string | null;
          title: string;
          location: string | null;
          notes: string | null;
          starts_at: string;
          ends_at: string;
          all_day: boolean;
          rrule: string | null;
          recurrence_parent_id: string | null;
          source: CalendarSource;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          family_id: string;
          title: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_attendees: {
        Row: { event_id: string; member_id: string };
        Insert: { event_id: string; member_id: string };
        Update: Partial<{ event_id: string; member_id: string }>;
        Relationships: [];
      };
      chores: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          icon: string | null;
          star_value: number;
          schedule_days: number[];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["chores"]["Row"]> & { family_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["chores"]["Row"]>;
        Relationships: [];
      };
      chore_assignments: {
        Row: { id: string; chore_id: string; member_id: string; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["chore_assignments"]["Row"]> & { chore_id: string; member_id: string };
        Update: Partial<Database["public"]["Tables"]["chore_assignments"]["Row"]>;
        Relationships: [];
      };
      chore_completions: {
        Row: { id: string; chore_id: string; member_id: string; completed_on: string; stars: number; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["chore_completions"]["Row"]> & {
          chore_id: string;
          member_id: string;
          completed_on: string;
        };
        Update: Partial<Database["public"]["Tables"]["chore_completions"]["Row"]>;
        Relationships: [];
      };
      rewards: {
        Row: { id: string; family_id: string; title: string; star_cost: number; active: boolean; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["rewards"]["Row"]> & { family_id: string; title: string; star_cost: number };
        Update: Partial<Database["public"]["Tables"]["rewards"]["Row"]>;
        Relationships: [];
      };
      reward_redemptions: {
        Row: { id: string; reward_id: string; member_id: string; redeemed_at: string; approved_by: string | null };
        Insert: Partial<Database["public"]["Tables"]["reward_redemptions"]["Row"]> & { reward_id: string; member_id: string };
        Update: Partial<Database["public"]["Tables"]["reward_redemptions"]["Row"]>;
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          family_id: string;
          title: string;
          url: string | null;
          notes: string | null;
          ingredients: { name: string; qty: string }[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recipes"]["Row"]> & { family_id: string; title: string };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Row"]>;
        Relationships: [];
      };
      meal_plan_entries: {
        Row: {
          id: string;
          family_id: string;
          date: string;
          slot: MealSlot;
          title: string | null;
          recipe_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["meal_plan_entries"]["Row"]> & { family_id: string; date: string };
        Update: Partial<Database["public"]["Tables"]["meal_plan_entries"]["Row"]>;
        Relationships: [];
      };
      lists: {
        Row: { id: string; family_id: string; name: string; kind: ListKind; sort_order: number; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["lists"]["Row"]> & { family_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["lists"]["Row"]>;
        Relationships: [];
      };
      list_items: {
        Row: {
          id: string;
          list_id: string;
          label: string;
          quantity: string | null;
          category: string | null;
          /** Grocery store section (e.g. Costco). Null = Any store. Unused for checklists. */
          store: string | null;
          checked: boolean;
          added_by: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["list_items"]["Row"]> & { list_id: string; label: string };
        Update: Partial<Database["public"]["Tables"]["list_items"]["Row"]>;
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          family_id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          taken_at: string | null;
          in_slideshow: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["photos"]["Row"]> & { family_id: string; storage_path: string };
        Update: Partial<Database["public"]["Tables"]["photos"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          family_id: string;
          member_id: string | null;
          kind: NotificationKind;
          title: string;
          body: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          family_id: string;
          kind: NotificationKind;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          family_id: string;
          idle_timeout_seconds: number;
          ambient_start: string | null;
          ambient_end: string | null;
          slideshow_interval_seconds: number;
          week_starts_on: number;
          default_hub_view: HubView;
          import_token: string | null;
          latitude: number | null;
          longitude: number | null;
          walmart_cart_enabled: boolean;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]> & { family_id: string };
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>;
        Relationships: [];
      };
      walmart_preferences: {
        Row: {
          id: string;
          family_id: string;
          list_label: string;
          preferred_title: string;
          search_query: string;
          walmart_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["walmart_preferences"]["Row"]> & {
          family_id: string;
          list_label: string;
          preferred_title: string;
          search_query: string;
        };
        Update: Partial<Database["public"]["Tables"]["walmart_preferences"]["Row"]>;
        Relationships: [];
      };
      integration_settings: {
        Row: {
          family_id: string;
          ai_provider: "anthropic" | "openai" | null;
          ai_api_key_enc: string | null;
          openai_api_key_enc: string | null;
          ai_model: string | null;
          openai_model: string | null;
          voice_provider: "browser" | "openai";
          voice_name: string | null;
          ha_base_url: string | null;
          ha_token_enc: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["integration_settings"]["Row"]> & { family_id: string };
        Update: Partial<Database["public"]["Tables"]["integration_settings"]["Row"]>;
        Relationships: [];
      };
      ha_buttons: {
        Row: {
          id: string;
          family_id: string;
          label: string;
          icon: string;
          entity_id: string;
          service: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ha_buttons"]["Row"]> & {
          family_id: string;
          label: string;
          entity_id: string;
          service: string;
        };
        Update: Partial<Database["public"]["Tables"]["ha_buttons"]["Row"]>;
        Relationships: [];
      };
    };
  };
}
