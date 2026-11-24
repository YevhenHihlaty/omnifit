"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import type {
  CoachCredentialsSnapshot,
  NotificationPrefs,
  PaymentCollection,
} from "./types"

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string }

const revalidateProfile = () => {
  revalidatePath(ROUTES.profile)
  revalidatePath(ROUTES.profilePlans)
  revalidatePath(ROUTES.profileCredentials)
  revalidatePath(ROUTES.profileSettings)
  revalidatePath(ROUTES.billing)
}

export const updatePaymentCollection = async (
  value: PaymentCollection
): Promise<ProfileActionResult> => {
  if (value !== "in_app" && value !== "direct") {
    return { success: false, error: "invalid_payment_collection" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  if (value === "in_app") {
    const { data: coach } = await supabase
      .from("coach_profiles")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!coach?.stripe_account_id) {
      return { success: false, error: "stripe_required" }
    }
    try {
      const { isConnectChargesReady } = await import("@/lib/stripe/connect")
      const ready = await isConnectChargesReady(coach.stripe_account_id)
      if (!ready) return { success: false, error: "stripe_not_ready" }
    } catch {
      return { success: false, error: "stripe_not_ready" }
    }
  }

  const { error } = await supabase
    .from("coach_profiles")
    .update({ payment_collection: value })
    .eq("user_id", user.id)

  if (error) return { success: false, error: "update_failed" }
  revalidateProfile()
  return { success: true }
}

export const updateMarketplaceVisible = async (
  visible: boolean
): Promise<ProfileActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { error } = await supabase
    .from("coach_profiles")
    .update({ marketplace_visible: visible })
    .eq("user_id", user.id)

  if (error) return { success: false, error: "update_failed" }
  revalidateProfile()
  return { success: true }
}

export const updatePersonalOrg = async (input: {
  name: string
  slug?: string | null
}): Promise<ProfileActionResult> => {
  const name = input.name.trim()
  if (!name) return { success: false, error: "name_required" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data: coach } = await supabase
    .from("coach_profiles")
    .select("source_organization_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!coach?.source_organization_id) {
    return { success: false, error: "org_not_found" }
  }

  const slug = input.slug?.trim()
    ? input.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : null

  const { error } = await supabase
    .from("organizations")
    .update({ name, slug })
    .eq("id", coach.source_organization_id)
    .eq("owner_id", user.id)
    .eq("kind", "personal")

  if (error) return { success: false, error: "update_failed" }
  revalidateProfile()
  return { success: true }
}

export const updateCredentials = async (
  credentials: CoachCredentialsSnapshot
): Promise<ProfileActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data: existing } = await supabase
    .from("coach_profiles")
    .select("onboarding_snapshot")
    .eq("user_id", user.id)
    .maybeSingle()

  const prev =
    existing?.onboarding_snapshot &&
    typeof existing.onboarding_snapshot === "object"
      ? (existing.onboarding_snapshot as Record<string, unknown>)
      : {}

  const next = {
    ...prev,
    credentials: {
      yearsExperience: credentials.yearsExperience.trim(),
      certifications: credentials.certifications.trim(),
      education: credentials.education.trim(),
      specialtiesText: credentials.specialtiesText.trim(),
    },
  }

  const { error } = await supabase
    .from("coach_profiles")
    .update({ onboarding_snapshot: next })
    .eq("user_id", user.id)

  if (error) return { success: false, error: "update_failed" }
  revalidateProfile()
  return { success: true }
}

export const updateNotificationPrefs = async (
  prefs: NotificationPrefs
): Promise<ProfileActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data: existing } = await supabase
    .from("coach_profiles")
    .select("onboarding_snapshot")
    .eq("user_id", user.id)
    .maybeSingle()

  const prev =
    existing?.onboarding_snapshot &&
    typeof existing.onboarding_snapshot === "object"
      ? (existing.onboarding_snapshot as Record<string, unknown>)
      : {}

  const next = {
    ...prev,
    notifications: {
      push: prefs.push,
      emailDigest: prefs.emailDigest,
      availableForBooking: prefs.availableForBooking,
    },
  }

  const { error } = await supabase
    .from("coach_profiles")
    .update({ onboarding_snapshot: next })
    .eq("user_id", user.id)

  if (error) return { success: false, error: "update_failed" }
  revalidateProfile()
  return { success: true }
}

export const createServicePlan = async (input: {
  title: string
  durationMinutes: number
  priceCents: number
  description?: string | null
  isPublished?: boolean
}): Promise<ProfileActionResult & { planId?: string }> => {
  const title = input.title.trim()
  if (!title) return { success: false, error: "title_required" }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return { success: false, error: "invalid_duration" }
  }
  if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
    return { success: false, error: "invalid_price" }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_service_plans")
    .insert({
      coach_id: user.id,
      title,
      description: input.description?.trim() || null,
      duration_minutes: Math.round(input.durationMinutes),
      price_cents: Math.round(input.priceCents),
      currency: "USD",
      is_published: input.isPublished === true,
    })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: "create_failed" }
  revalidateProfile()
  return { success: true, planId: data.id }
}

export const updateServicePlan = async (input: {
  planId: string
  title: string
  durationMinutes: number
  priceCents: number
  description?: string | null
  isPublished: boolean
}): Promise<ProfileActionResult> => {
  const title = input.title.trim()
  if (!input.planId.trim()) return { success: false, error: "not_found" }
  if (!title) return { success: false, error: "title_required" }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_service_plans")
    .update({
      title,
      description: input.description?.trim() || null,
      duration_minutes: Math.round(input.durationMinutes),
      price_cents: Math.round(input.priceCents),
      is_published: input.isPublished,
    })
    .eq("id", input.planId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "update_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidateProfile()
  return { success: true }
}

export const deleteServicePlan = async (
  planId: string
): Promise<ProfileActionResult> => {
  if (!planId.trim()) return { success: false, error: "not_found" }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { data, error } = await supabase
    .from("coach_service_plans")
    .delete()
    .eq("id", planId)
    .eq("coach_id", user.id)
    .select("id")
    .maybeSingle()

  if (error) return { success: false, error: "delete_failed" }
  if (!data) return { success: false, error: "not_found" }
  revalidateProfile()
  return { success: true }
}
