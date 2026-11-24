import { createClient } from "@supabase/supabase-js"

/** Service-role client for webhook / server-only writes. Never expose to browser. */
export const createSupabaseServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("missing_supabase_service_role")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
