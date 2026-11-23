/**
 * GazeConnect Supabase Client
 * Safe browser client initialization using anon key.
 * Never uses service role keys on the frontend.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (clientInstance) {
    return clientInstance;
  }

  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project")) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return clientInstance;
    } catch (e) {
      console.warn("Failed to initialize Supabase client:", e);
      return null;
    }
  }

  return null;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project") &&
    !supabaseAnonKey.includes("your-")
  );
};
