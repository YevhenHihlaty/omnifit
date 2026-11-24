"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { listClientCoachesResult } from "@/features/client-settings/list-client-coaches"
import { mapBookingRequestRow } from "./map-booking-request"
import type { BookingRequestRow, BookingRequestSummary } from "./types"
import type { CalendarSession } from "@/features/app-calendar/types"

type ProfileLite = { display_name: string | null; email?: string | null }

const asProfile = (value: unknown): ProfileLite | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    const first = value[0]
    if (!first || typeof first !== "object") return null
    return first as ProfileLite
  }
  if (typeof value === "object") return value as ProfileLite
  return null
}

const COACH_PENDING_SELECT = `
  id,
  coach_id,
  client_id,
  sport_type,
  starts_at,
  ends_at,
  duration_minutes,
  status,
  client_note,
  decline_reason,
  session_id,
  created_at,
  client:profiles!booking_requests_client_id_fkey(display_name, email)
`

const CLIENT_REQUESTS_SELECT = `
  id,
  coach_id,
  client_id,
  sport_type,
  starts_at,
  ends_at,
  duration_minutes,
  status,
  client_note,
  decline_reason,
  session_id,
  created_at,
  coach:profiles!booking_requests_coach_id_fkey(display_name, email)
`

export type ClientCoachOption = {
  coachId: string
  displayName: string
}

export const listClientActiveCoaches = async (): Promise<{
  coaches: ClientCoachOption[]
  loadFailed: boolean
}> => {
  const result = await listClientCoachesResult()
  return {
    coaches: result.coaches.map((row) => ({
      coachId: row.coachId,
      displayName: row.displayName,
    })),
    loadFailed: result.loadFailed,
  }
}

export const listCoachPendingBookingRequests = async (): Promise<{
  requests: BookingRequestSummary[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { requests: [], loadFailed: true }

  const { data, error } = await supabase
    .from("booking_requests")
    .select(COACH_PENDING_SELECT)
    .eq("coach_id", user.id)
    .eq("status", "pending")
    .eq("kind", "coaching")
    .order("starts_at", { ascending: true })
    .limit(40)

  if (error) return { requests: [], loadFailed: true }
  return {
    requests: ((data ?? []) as unknown as BookingRequestRow[]).map((row) =>
      mapBookingRequestRow(
        {
          ...row,
          client: asProfile(row.client),
          coach: asProfile(row.coach),
        },
        "coach"
      )
    ),
    loadFailed: false,
  }
}

export const listClientBookingRequests = async (): Promise<{
  requests: BookingRequestSummary[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { requests: [], loadFailed: true }

  const { data, error } = await supabase
    .from("booking_requests")
    .select(CLIENT_REQUESTS_SELECT)
    .eq("client_id", user.id)
    .eq("kind", "coaching")
    .in("status", ["pending", "declined"])
    .order("created_at", { ascending: false })
    .limit(40)

  if (error) return { requests: [], loadFailed: true }
  return {
    requests: ((data ?? []) as unknown as BookingRequestRow[]).map((row) =>
      mapBookingRequestRow(
        {
          ...row,
          client: asProfile(row.client),
          coach: asProfile(row.coach),
        },
        "client"
      )
    ),
    loadFailed: false,
  }
}

export const loadCoachCalendarSessions = async (
  fromIso: string,
  toIso: string
): Promise<{ sessions: CalendarSession[]; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sessions: [], loadFailed: true }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      title,
      starts_at,
      ends_at,
      duration_minutes,
      status,
      sport_type,
      client_id,
      payment_status,
      client:profiles!sessions_client_id_fkey(display_name, email)
    `
    )
    .eq("coach_id", user.id)
    .neq("status", "cancelled")
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(200)

  if (error) return { sessions: [], loadFailed: true }

  return {
    sessions: (data ?? []).map((row) => {
      const client = asProfile(row.client)
      const name =
        client?.display_name?.trim() ||
        client?.email?.split("@")[0] ||
        "Client"
      return {
        id: row.id as string,
        title: (row.title as string) || "Session",
        startsAt: row.starts_at as string,
        endsAt: row.ends_at as string,
        durationMinutes: Number(row.duration_minutes ?? 0),
        status: String(row.status ?? "upcoming"),
        counterpartName: name,
        sportType: (row.sport_type as string | null) ?? null,
        clientId: (row.client_id as string | null) ?? null,
        paymentStatus: (row.payment_status as string | null) ?? null,
      }
    }),
    loadFailed: false,
  }
}

export const loadClientCalendarSessions = async (
  fromIso: string,
  toIso: string
): Promise<{ sessions: CalendarSession[]; loadFailed: boolean }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { sessions: [], loadFailed: true }

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      title,
      starts_at,
      ends_at,
      duration_minutes,
      status,
      sport_type,
      client_id,
      payment_status,
      coach:profiles!sessions_coach_id_fkey(display_name, email)
    `
    )
    .eq("client_id", user.id)
    .neq("status", "cancelled")
    .gte("starts_at", fromIso)
    .lte("starts_at", toIso)
    .order("starts_at", { ascending: true })
    .limit(200)

  if (error) return { sessions: [], loadFailed: true }

  return {
    sessions: (data ?? []).map((row) => {
      const coach = asProfile(row.coach)
      const name =
        coach?.display_name?.trim() ||
        coach?.email?.split("@")[0] ||
        "Coach"
      return {
        id: row.id as string,
        title: (row.title as string) || "Session",
        startsAt: row.starts_at as string,
        endsAt: row.ends_at as string,
        durationMinutes: Number(row.duration_minutes ?? 0),
        status: String(row.status ?? "upcoming"),
        counterpartName: name,
        sportType: (row.sport_type as string | null) ?? null,
        clientId: (row.client_id as string | null) ?? null,
        paymentStatus: (row.payment_status as string | null) ?? null,
      }
    }),
    loadFailed: false,
  }
}

export const getClientHasPhone = async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from("profiles")
    .select("phone_e164")
    .eq("id", user.id)
    .maybeSingle()
  return Boolean(data?.phone_e164)
}

export const getCoachBookingSettings = async (): Promise<{
  freeFirstSession: boolean
  paymentCollection: "in_app" | "direct"
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      freeFirstSession: false,
      paymentCollection: "direct",
      loadFailed: true,
    }
  }
  const { data, error } = await supabase
    .from("coach_profiles")
    .select("free_first_session, payment_collection")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error || !data) {
    return {
      freeFirstSession: false,
      paymentCollection: "direct",
      loadFailed: Boolean(error),
    }
  }
  return {
    freeFirstSession: data.free_first_session === true,
    paymentCollection:
      data.payment_collection === "in_app" ? "in_app" : "direct",
    loadFailed: false,
  }
}
