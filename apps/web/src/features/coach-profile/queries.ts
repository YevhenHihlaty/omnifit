"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getStripeConnectStatus } from "@/features/payments/checkout-queries"
import {
  emptyCredentials,
  parseCredentialsSnapshot,
  parseNotificationPrefs,
  type CoachProfileHub,
  type PaymentCollection,
  type ServicePlan,
} from "./types"

export const getCoachProfileHub = async (): Promise<{
  hub: CoachProfileHub | null
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hub: null, loadFailed: false }

  const [{ data: profile }, { data: coach, error: coachError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("coach_profiles")
        .select(
          "bio, specialties, payment_collection, marketplace_visible, stripe_account_id, onboarding_snapshot, personal_subscription_tier, source_organization_id"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ])

  if (coachError) return { hub: null, loadFailed: true }
  if (!coach) return { hub: null, loadFailed: false }

  let orgName = profile?.display_name?.trim() || "Practice"
  let orgSlug: string | null = null
  const orgId = coach.source_organization_id as string | null

  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name, slug")
      .eq("id", orgId)
      .eq("kind", "personal")
      .maybeSingle()
    if (org) {
      orgName = org.name
      orgSlug = org.slug
    }
  }

  const payment: PaymentCollection =
    coach.payment_collection === "in_app" ? "in_app" : "direct"

  const stripeAccountId = (coach.stripe_account_id as string | null) ?? null
  const stripeConnectStatus = await getStripeConnectStatus(stripeAccountId)

  return {
    hub: {
      displayName: profile?.display_name?.trim() || "Coach",
      avatarUrl: profile?.avatar_url ?? null,
      bio: coach.bio,
      specialties: Array.isArray(coach.specialties)
        ? coach.specialties.filter((s): s is string => typeof s === "string")
        : [],
      paymentCollection: payment,
      marketplaceVisible: coach.marketplace_visible === true,
      stripeAccountId,
      stripeConnectStatus,
      personalOrgId: orgId,
      personalOrgName: orgName,
      personalOrgSlug: orgSlug,
      credentials: parseCredentialsSnapshot(coach.onboarding_snapshot) || emptyCredentials(),
      notifications: parseNotificationPrefs(coach.onboarding_snapshot),
      tier: String(coach.personal_subscription_tier ?? "free"),
    },
    loadFailed: false,
  }
}

export const listCoachServicePlans = async (): Promise<{
  plans: ServicePlan[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { plans: [], loadFailed: false }

  const { data, error } = await supabase
    .from("coach_service_plans")
    .select(
      "id, title, description, duration_minutes, price_cents, currency, is_published"
    )
    .eq("coach_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return { plans: [], loadFailed: true }

  return {
    plans: (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      durationMinutes: row.duration_minutes,
      priceCents: row.price_cents,
      currency: row.currency ?? "USD",
      isPublished: row.is_published === true,
    })),
    loadFailed: false,
  }
}
