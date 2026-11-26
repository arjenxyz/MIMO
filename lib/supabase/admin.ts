import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only admin client (bypasses RLS).
 * Prefers new Supabase secret keys (`sb_secret_...`); falls back to legacy service_role JWT.
 */
export function getSupabaseAdminKey(): string | undefined {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined
  );
}

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabaseAdminKey();

  if (!url || !key) {
    throw new Error(
      "Supabase admin env eksik. SUPABASE_SECRET_KEY (veya legacy SUPABASE_SERVICE_ROLE_KEY) ve NEXT_PUBLIC_SUPABASE_URL gerekli."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
