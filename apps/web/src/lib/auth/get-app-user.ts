import { createSupabaseServerClient } from "@/lib/supabase/server"
import { resolveUserRole } from "./resolve-user-role"
import type { UserRole } from "@omnifit/shared"

export type AppUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: UserRole | null
  onboardingCompletedAt: string | null
}

/** Fetch the authenticated user + their profile row. Returns null if not signed in. */
export const getAppUser = async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role, onboarding_completed_at")
    .eq("id", user.id)
    .single()

  // ponytail: profile.role is the authoritative source (DB-enforced, write-once)
  // app_metadata is intentionally not used — resolveUserRole is profile-only
  const role = resolveUserRole(profile)

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    role,
    onboardingCompletedAt: profile?.onboarding_completed_at ?? null,
  }
}
