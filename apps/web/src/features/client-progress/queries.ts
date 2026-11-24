"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { weekStartSundayIso } from "@/features/weekly-checkin/week-start"
import type {
  ClientProgressPageData,
  HistoryFeedItem,
  LatestMeasurements,
  PastCheckinSummary,
  ProgressPhotoListItem,
  WeightPoint,
} from "./types"

export const loadClientProgressPageData = async (
  userId: string,
  timeZone: string
): Promise<{ data: ClientProgressPageData; loadFailed: boolean }> => {
  const weekStart = weekStartSundayIso(new Date(), timeZone)
  const supabase = await createSupabaseServerClient()

  const [
    profileRes,
    metricsRes,
    photosRes,
    workoutsRes,
    mealsRes,
    checkinsRes,
  ] = await Promise.all([
    supabase
      .from("client_profiles")
      .select("goal")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("body_metrics")
      .select(
        "id, logged_at, weight_kg, waist_cm, chest_cm, arm_cm, hip_cm"
      )
      .eq("client_id", userId)
      .order("logged_at", { ascending: false })
      .limit(90),
    supabase
      .from("progress_photos")
      .select("id, pose, storage_path, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("workouts")
      .select("id, sport_type, logged_at")
      .eq("client_id", userId)
      .order("logged_at", { ascending: false })
      .limit(15),
    supabase
      .from("meals")
      .select("id, meal_type, logged_at")
      .eq("client_id", userId)
      .order("logged_at", { ascending: false })
      .limit(15),
    supabase
      .from("weekly_checkins")
      .select(
        "id, week_start, sleep, soreness, stress, energy, motivation, created_at"
      )
      .eq("client_id", userId)
      .order("week_start", { ascending: false })
      .limit(8),
  ])

  const loadFailed = Boolean(
    profileRes.error ||
      metricsRes.error ||
      photosRes.error ||
      workoutsRes.error ||
      mealsRes.error ||
      checkinsRes.error
  )

  const metricsRows = metricsRes.data ?? []

  const weightTrend: WeightPoint[] = metricsRows
    .filter((row) => row.weight_kg != null)
    .map((row) => ({
      loggedAt: row.logged_at,
      weightKg: Number(row.weight_kg),
    }))
    .reverse()

  const latest = metricsRows[0]
  const latestMeasurements: LatestMeasurements | null = latest
    ? {
        weightKg:
          latest.weight_kg != null ? Number(latest.weight_kg) : null,
        waistCm: latest.waist_cm != null ? Number(latest.waist_cm) : null,
        chestCm: latest.chest_cm != null ? Number(latest.chest_cm) : null,
        armCm: latest.arm_cm != null ? Number(latest.arm_cm) : null,
        hipCm: latest.hip_cm != null ? Number(latest.hip_cm) : null,
        loggedAt: latest.logged_at,
      }
    : null

  const photoRows = photosRes.data ?? []
  const signedUrls = await Promise.all(
    photoRows.map(async (row) => {
      const { data } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(row.storage_path, 3600)
      return data?.signedUrl ?? null
    })
  )

  const photos: ProgressPhotoListItem[] = photoRows.map((row, index) => ({
    id: row.id,
    pose: row.pose,
    storagePath: row.storage_path,
    loggedAt: row.created_at,
    url: signedUrls[index],
  }))

  const history: HistoryFeedItem[] = [
    ...(workoutsRes.data ?? []).map((row) => ({
      id: `w-${row.id}`,
      kind: "workout" as const,
      titleKey: row.sport_type,
      loggedAt: row.logged_at,
    })),
    ...(mealsRes.data ?? []).map((row) => ({
      id: `m-${row.id}`,
      kind: "meal" as const,
      titleKey: row.meal_type,
      loggedAt: row.logged_at,
    })),
    ...metricsRows.slice(0, 10).map((row) => ({
      id: `b-${row.id}`,
      kind: "metrics" as const,
      titleKey: "metrics",
      weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
      loggedAt: row.logged_at,
    })),
    ...(checkinsRes.data ?? []).map((row) => ({
      id: `c-${row.id}`,
      kind: "checkin" as const,
      titleKey: "checkin",
      loggedAt: row.created_at ?? `${row.week_start}T12:00:00.000Z`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    )
    .slice(0, 30)

  const pastCheckins: PastCheckinSummary[] = (checkinsRes.data ?? []).map(
    (row) => ({
      weekStart: row.week_start,
      sleep: row.sleep,
      soreness: row.soreness,
      stress: row.stress,
      energy: row.energy,
      motivation: row.motivation,
    })
  )

  const thisWeekCheckin =
    pastCheckins.find((row) => row.weekStart === weekStart) ?? null

  return {
    data: {
      goal: profileRes.data?.goal ?? null,
      weightTrend,
      latestMeasurements,
      photos,
      history,
      thisWeekCheckin,
      pastCheckins,
      weekStart,
    },
    loadFailed,
  }
}
