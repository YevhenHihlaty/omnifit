"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildHistoryEntries,
  filterHistoryEntries,
  groupHistoryEntries,
  type HistoryFilter,
  type HistoryGroup,
  type HistoryLabels,
  type HistoryMealRow,
  type HistoryMetricsRow,
  type HistoryWorkoutRow,
} from "./history-mappers"
import {
  buildWeightTrend,
  computeAdherence,
  groupProgressPhotos,
  pickLatestMeasurements,
  pickLatestMeasurementNotes,
  buildMeasurementSparks,
  pickLatestTwoCheckins,
  buildTrainingVolumeWeeks,
  type AnalyticsMetricsRow,
  type AnalyticsPhotoRow,
  type CheckinCompareRow,
  type PhotoCheckIn,
  type VolumeWeek,
  type WeightPoint,
} from "./analytics-mappers"

const assertCoachClientAccess = async (clientId: string) => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "unauthenticated" }

  const { data: rel } = await supabase
    .from("coach_client_relationships")
    .select("id")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle()

  if (!rel) return { ok: false as const, error: "forbidden" }
  return { ok: true as const, supabase, coachId: user.id }
}

const profileNamesById = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  ids: string[]
) => {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map<string, string>()
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", unique)
  return new Map(
    (data ?? []).map((row) => {
      const name = String(row.display_name ?? "").trim()
      const email = String(row.email ?? "").trim()
      const fallback = email.includes("@") ? email.split("@")[0]! : email
      return [row.id as string, name || fallback || ""]
    })
  )
}

export type HistoryRangeDays = 7 | 30 | 90

export type CoachHistoryPageData = {
  groups: HistoryGroup[]
  totalCount: number
  rangeDays: HistoryRangeDays
}

export const loadCoachClientHistory = async (
  clientId: string,
  labels: HistoryLabels,
  filter: HistoryFilter = "all",
  rangeDays: HistoryRangeDays = 30
): Promise<
  { data: CoachHistoryPageData; loadFailed: boolean } | { error: string }
> => {
  const access = await assertCoachClientAccess(clientId)
  if (!access.ok) return { error: access.error }
  const { supabase } = access

  const since = new Date(
    Date.now() - rangeDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const [mealsRes, workoutsRes, metricsRes] = await Promise.all([
    supabase
      .from("meals")
      .select(
        "id, meal_type, logged_at, meal_items(quantity_servings, product:food_products(calories_kcal))"
      )
      .eq("client_id", clientId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(80),
    supabase
      .from("workouts")
      .select(
        "id, sport_type, logged_at, duration_sec, source, logged_by_id, session_id, workout_sets(id)"
      )
      .eq("client_id", clientId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(80),
    supabase
      .from("body_metrics")
      .select("id, logged_at, weight_kg")
      .eq("client_id", clientId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(80),
  ])

  // Fallback meal select if food_products alias fails
  let mealRows: Array<Record<string, unknown>> | null = mealsRes.data as
    | Array<Record<string, unknown>>
    | null
  let mealError = mealsRes.error
  if (mealError) {
    const fallback = await supabase
      .from("meals")
      .select("id, meal_type, logged_at")
      .eq("client_id", clientId)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false })
      .limit(80)
    mealRows = fallback.data as Array<Record<string, unknown>> | null
    mealError = fallback.error
  }

  const workoutRows = workoutsRes.data ?? []
  const loggerIds = workoutRows.map((r) => String(r.logged_by_id ?? ""))
  const sessionIds = workoutRows
    .map((r) => r.session_id as string | null)
    .filter(Boolean) as string[]

  let sessionCoachIds: Record<string, string> = {}
  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, coach_id")
      .in("id", sessionIds)
    sessionCoachIds = Object.fromEntries(
      (sessions ?? []).map((s) => [s.id as string, String(s.coach_id ?? "")])
    )
  }

  const names = await profileNamesById(supabase, [
    ...loggerIds,
    ...Object.values(sessionCoachIds),
  ])

  const nameOrFallback = (id: string | null | undefined) => {
    if (!id) return null
    const n = names.get(id)?.trim()
    return n || null
  }

  const loadFailed = Boolean(
    mealError || workoutsRes.error || metricsRes.error
  )

  const meals: HistoryMealRow[] = (mealRows ?? []).map((row) => {
    const items = Array.isArray(row.meal_items) ? row.meal_items : []
    let calories = 0
    for (const item of items) {
      const rec = item as {
        quantity_servings?: number
        product?: { calories_kcal?: number } | null
      }
      calories +=
        Number(rec.quantity_servings ?? 0) *
        Number(rec.product?.calories_kcal ?? 0)
    }
    return {
      id: String(row.id),
      meal_type: String(row.meal_type),
      logged_at: String(row.logged_at),
      calories: items.length > 0 ? calories : null,
    }
  })

  const workouts: HistoryWorkoutRow[] = workoutRows.map((row) => {
    const sets = Array.isArray(row.workout_sets) ? row.workout_sets : []
    const sessionId = row.session_id as string | null
    const sessionCoachId = sessionId ? sessionCoachIds[sessionId] : null
    return {
      id: row.id as string,
      sport_type: row.sport_type as string,
      logged_at: row.logged_at as string,
      duration_sec: (row.duration_sec as number | null) ?? null,
      set_count: sets.length,
      source: row.source as string,
      logged_by_name: nameOrFallback(String(row.logged_by_id ?? "")),
      session_coach_name: sessionCoachId
        ? nameOrFallback(sessionCoachId)
        : null,
    }
  })

  const metrics: HistoryMetricsRow[] = (metricsRes.data ?? []).map((row) => ({
    id: row.id,
    logged_at: row.logged_at,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
  }))

  const all = buildHistoryEntries(meals, workouts, metrics, labels)
  const filtered = filterHistoryEntries(all, filter)
  const groups = groupHistoryEntries(filtered, new Date(), labels)

  return {
    data: { groups, totalCount: filtered.length, rangeDays },
    loadFailed,
  }
}

export type CoachAnalyticsPageData = {
  adherencePercent: number
  workoutsCompleted: number
  workoutsTarget: number
  weightPoints: WeightPoint[]
  weightChangeKg: number | null
  volumeWeeks: VolumeWeek[]
  measurements: {
    waistCm: number | null
    hipsCm: number | null
    chestCm: number | null
    armCm: number | null
    loggedAt: string | null
  }
  measurementSparks: {
    waist: number[]
    hips: number[]
    chest: number[]
    arm: number[]
  }
  measurementNotes: string | null
  photoCheckIns: PhotoCheckIn[]
  checkinA: CheckinCompareRow | null
  checkinB: CheckinCompareRow | null
}

export const loadCoachClientAnalytics = async (
  clientId: string
): Promise<
  { data: CoachAnalyticsPageData; loadFailed: boolean } | { error: string }
> => {
  const access = await assertCoachClientAccess(clientId)
  if (!access.ok) return { error: access.error }
  const { supabase } = access

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since8w = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString()

  const [workoutsRes, metricsRes, photosRes, checkinsRes, volumeRes] =
    await Promise.all([
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("logged_at", since30),
    supabase
      .from("body_metrics")
      .select("id, logged_at, weight_kg, waist_cm, hip_cm, chest_cm, arm_cm, notes")
      .eq("client_id", clientId)
      .gte("logged_at", since8w)
      .order("logged_at", { ascending: false })
      .limit(60),
    supabase
      .from("progress_photos")
      .select("body_metrics_id, pose, storage_path, created_at, body_metrics(logged_at)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(36),
    supabase
      .from("weekly_checkins")
      .select("week_start, sleep, soreness, stress, energy, motivation")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false })
      .limit(2),
    supabase
      .from("workouts")
      .select("logged_at, workout_sets(id)")
      .eq("client_id", clientId)
      .gte("logged_at", since8w)
      .order("logged_at", { ascending: true }),
  ])

  const loadFailed = Boolean(
    workoutsRes.error ||
      metricsRes.error ||
      photosRes.error ||
      checkinsRes.error ||
      volumeRes.error
  )

  const metricsRows: AnalyticsMetricsRow[] = (metricsRes.data ?? []).map(
    (row) => ({
      id: row.id,
      logged_at: row.logged_at,
      weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
      waist_cm: row.waist_cm != null ? Number(row.waist_cm) : null,
      hip_cm: row.hip_cm != null ? Number(row.hip_cm) : null,
      chest_cm: row.chest_cm != null ? Number(row.chest_cm) : null,
      arm_cm: row.arm_cm != null ? Number(row.arm_cm) : null,
      notes: typeof row.notes === "string" ? row.notes : null,
    })
  )

  const photoRows: AnalyticsPhotoRow[] = (photosRes.data ?? []).map((row) => {
    const bm = row.body_metrics as
      | { logged_at: string }
      | { logged_at: string }[]
      | null
    const logged =
      Array.isArray(bm) ? bm[0] ?? null : bm
    return {
      body_metrics_id: row.body_metrics_id,
      pose: row.pose as "front" | "side" | "back",
      storage_path: row.storage_path,
      created_at: row.created_at,
      body_metrics: logged,
    }
  })

  const signedUrls: Record<string, string | null> = {}
  await Promise.all(
    photoRows.map(async (row) => {
      const { data } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(row.storage_path, 3600)
      signedUrls[row.storage_path] = data?.signedUrl ?? null
    })
  )

  const adherence = computeAdherence(workoutsRes.count ?? 0, 12)
  const weight = buildWeightTrend(metricsRows, 56)
  const measurements = pickLatestMeasurements(metricsRows)
  const measurementSparks = buildMeasurementSparks(metricsRows)
  const measurementNotes = pickLatestMeasurementNotes(metricsRows)
  const photoCheckIns = groupProgressPhotos(photoRows, signedUrls)
  const volumeWeeks = buildTrainingVolumeWeeks(
    (volumeRes.data ?? []).map((row) => ({
      logged_at: row.logged_at as string,
      set_count: Array.isArray(row.workout_sets) ? row.workout_sets.length : 0,
    })),
    8
  )
  const checkinRows: CheckinCompareRow[] = (checkinsRes.data ?? []).map(
    (row) => ({
      weekStart: row.week_start,
      sleep: row.sleep,
      soreness: row.soreness,
      stress: row.stress,
      energy: row.energy,
      motivation: row.motivation,
    })
  )
  const [checkinA, checkinB] = pickLatestTwoCheckins(checkinRows)

  return {
    data: {
      ...adherence,
      weightPoints: weight.weightPoints,
      weightChangeKg: weight.weightChangeKg,
      volumeWeeks,
      measurements,
      measurementSparks,
      measurementNotes,
      photoCheckIns,
      checkinA,
      checkinB,
    },
    loadFailed,
  }
}
