"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type PendingClientInvite = {
  id: string
  email: string
  status: string
  createdAt: string
  expiresAt: string
}

export type CoachRosterUsage = {
  tier: string
  activeCount: number
  limit: number | null
  canInvite: boolean
}

export const listPendingClientInvites = async (): Promise<PendingClientInvite[]> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from("client_invites")
    .select("id, email, status, created_at, expires_at")
    .eq("coach_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }))
}

export const getCoachRosterUsage = async (): Promise<CoachRosterUsage | null> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("get_coach_roster_usage")

  if (error || !data || typeof data !== "object") return null

  const payload = data as Record<string, unknown>
  if (payload.success !== true) return null

  const limitRaw = payload.limit
  const limit =
    limitRaw === null || limitRaw === undefined
      ? null
      : typeof limitRaw === "number"
        ? limitRaw
        : Number(limitRaw)

  return {
    tier: String(payload.tier ?? "free"),
    activeCount:
      typeof payload.active_count === "number"
        ? payload.active_count
        : Number(payload.active_count ?? 0),
    limit: Number.isFinite(limit) ? limit : null,
    canInvite: payload.can_invite === true,
  }
}
