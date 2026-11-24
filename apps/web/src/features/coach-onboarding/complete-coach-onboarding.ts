"use server"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

type CompleteOnboardingInput = {
  displayName?: string
  bio?: string
  specialties?: string[]
  snapshot?: Record<string, unknown>
}

export const completeCoachOnboarding = async (input: CompleteOnboardingInput = {}): Promise<void> => {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc("ensure_coach_personal_organization", {
    p_display_name: input.displayName ?? null,
    p_bio: input.bio ?? null,
    p_specialties: input.specialties ?? null,
    p_snapshot: input.snapshot ? JSON.stringify(input.snapshot) : null,
  })

  if (error) {
    // ponytail: surface via redirect with error param; real error UI lands in Sprint 3
    redirect(`${ROUTES.onboardingProfile}?error=complete_failed`)
  }

  redirect(ROUTES.dashboard)
}
