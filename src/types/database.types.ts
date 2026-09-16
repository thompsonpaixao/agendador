/**
 * Definições de tipos do Banco de Dados PostgreSQL / Supabase
 * Preparadas para sincronização direta com migrations do Supabase CLI
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          instagram_user_id: string;
          username: string;
          name: string;
          profile_picture_url: string;
          status: string;
          status_message: string | null;
          meta_access_token_encrypted: string | null;
          token_expires_at: string | null;
          default_reel_caption: string;
          default_carousel_caption: string;
          default_reels_per_day: number;
          default_carousels_per_day: number;
          default_times: string[];
          use_random_variation: boolean;
          random_variation_minutes: number;
        };
        Insert: Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      media: {
        Row: {
          id: string;
          account_id: string;
          storage_path: string;
          public_url: string;
          thumbnail_url: string | null;
          media_type: "video" | "image";
          size_bytes: number;
          duration_seconds: number | null;
          created_at: string;
        };
      };
      reel_queues: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          status: string;
          posts_per_day: number;
          daily_times: string[];
          distribute_until_empty: boolean;
          start_date: string;
          created_at: string;
        };
      };
      carousels: {
        Row: {
          id: string;
          account_id: string;
          queue_id: string | null;
          title: string;
          caption: string;
          position: number;
          status: string;
          scheduled_at: string | null;
          created_at: string;
        };
      };
      carousel_items: {
        Row: {
          id: string;
          carousel_id: string;
          media_id: string;
          position: number;
          created_at: string;
        };
      };
      scheduled_posts: {
        Row: {
          id: string;
          account_id: string;
          post_type: "reel" | "carousel";
          target_id: string;
          scheduled_at: string;
          status: string;
          meta_container_id: string | null;
          created_at: string;
        };
      };
      published_posts: {
        Row: {
          id: string;
          account_id: string;
          post_type: "reel" | "carousel";
          meta_media_id: string;
          published_at: string;
          views: number;
          reach: number;
          likes: number;
          comments: number;
          shares: number;
          saves: number;
        };
      };
      error_logs: {
        Row: {
          id: string;
          account_id: string;
          category: string;
          severity: string;
          error_code: string;
          error_message: string;
          attempts: number;
          status: string;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          account_id: string | null;
          type: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
      };
    };
  };
}
