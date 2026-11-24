"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"

export type BookingActionResult =
  | { success: true; sessionId?: string; paymentStatus?: string }
  | { success: false; error: string }

const KNOWN_CODES = new Set([
  "phone_required",
  "slot_busy",
  "not_pending",
  "not_found",
  "reason_required",
  "decline_reason_required",
  "no_active_relationship",
  "missing_coach",
  "duplicate_pending_request",
  "not_authenticated",
  "invalid_duration",
  "missing_starts_at",
  "missing_sport_type",
  "past_starts_at",
  "accept_failed",
  "decline_failed",
  "create_failed",
])

const toErrorCode = (raw: string | undefined, fallback: string) => {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (KNOWN_CODES.has(trimmed)) {
    return trimmed === "reason_required" ? "decline_reason_required" : trimmed
  }
  return fallback
}

export const acceptBookingRequest = async (
  requestId: string
): Promise<BookingActionResult> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("accept_booking_request", {
    p_request_id: requestId,
  })
  if (error) return { success: false, error: "accept_failed" }
  const payload = data as {
    success?: boolean
    error?: string
    session_id?: string
    payment_status?: string
  }
  if (!payload?.success) {
    return {
      success: false,
      error: toErrorCode(payload?.error, "accept_failed"),
    }
  }
  revalidatePath(ROUTES.sessions)
  revalidatePath(ROUTES.clientCalendar)
  return {
    success: true,
    sessionId: payload.session_id,
    paymentStatus: payload.payment_status,
  }
}

export const declineBookingRequest = async (
  requestId: string,
  reason: string
): Promise<BookingActionResult> => {
  const trimmed = reason.trim()
  if (!trimmed) return { success: false, error: "decline_reason_required" }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("decline_booking_request", {
    p_request_id: requestId,
    p_reason: trimmed,
  })
  if (error) return { success: false, error: "decline_failed" }
  const payload = data as { success?: boolean; error?: string }
  if (!payload?.success) {
    return {
      success: false,
      error: toErrorCode(payload?.error, "decline_failed"),
    }
  }
  revalidatePath(ROUTES.sessions)
  revalidatePath(ROUTES.clientCalendar)
  return { success: true }
}

export const createCoachingBookingRequest = async (params: {
  coachId: string
  startsAt: string
  durationMinutes: number
  sportType: string
  clientNote?: string
}): Promise<BookingActionResult> => {
  const startsMs = Date.parse(params.startsAt)
  if (!Number.isFinite(startsMs)) {
    return { success: false, error: "missing_starts_at" }
  }
  if (startsMs <= Date.now()) {
    return { success: false, error: "past_starts_at" }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("create_coaching_booking_request", {
    p_coach_id: params.coachId,
    p_starts_at: params.startsAt,
    p_duration_minutes: params.durationMinutes,
    p_sport_type: params.sportType,
    p_client_note: params.clientNote ?? null,
  })
  if (error) return { success: false, error: "create_failed" }
  const payload = data as { success?: boolean; error?: string }
  if (!payload?.success) {
    return {
      success: false,
      error: toErrorCode(payload?.error, "create_failed"),
    }
  }
  revalidatePath(ROUTES.clientCalendar)
  revalidatePath(ROUTES.sessions)
  return { success: true }
}

export const updateCoachFreeFirstSession = async (
  enabled: boolean
): Promise<BookingActionResult> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "not_authenticated" }

  const { error } = await supabase
    .from("coach_profiles")
    .update({ free_first_session: enabled })
    .eq("user_id", user.id)

  if (error) return { success: false, error: "generic" }
  revalidatePath(ROUTES.sessions)
  return { success: true }
}
