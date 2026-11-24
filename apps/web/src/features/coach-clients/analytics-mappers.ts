/** Pure analytics mappers for coach Analytics tab (Sprint 8). */

export type WeightPoint = { loggedAt: string; weightKg: number }

export type ProgressPhoto = { pose: "front" | "side" | "back"; url: string | null }

export type PhotoCheckIn = {
  bodyMetricsId: string
  loggedAt: string
  photos: ProgressPhoto[]
}

export type AnalyticsPhotoRow = {
  body_metrics_id: string
  pose: "front" | "side" | "back"
  storage_path: string
  created_at: string
  body_metrics: { logged_at: string } | null
}

export type AnalyticsMetricsRow = {
  id: string
  logged_at: string
  weight_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
  chest_cm: number | null
  arm_cm: number | null
  notes?: string | null
}

export type CheckinCompareRow = {
  weekStart: string
  sleep: number | null
  soreness: number | null
  stress: number | null
  energy: number | null
  motivation: number | null
}

export const computeAdherence = (
  workoutsCompleted: number,
  workoutsTarget: number
) => {
  const target = Math.max(workoutsTarget, 1)
  return {
    adherencePercent: Math.min(
      Math.round((workoutsCompleted / target) * 100),
      100
    ),
    workoutsCompleted,
    workoutsTarget: target,
  }
}

export const buildWeightTrend = (
  rows: AnalyticsMetricsRow[],
  periodDays: number
) => {
  const points: WeightPoint[] = rows
    .filter((row) => row.weight_kg != null)
    .map((row) => ({
      loggedAt: row.logged_at,
      weightKg: row.weight_kg as number,
    }))
    .sort(
      (a, b) =>
        new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    )
  const first = points[0]?.weightKg ?? null
  const last = points[points.length - 1]?.weightKg ?? null
  const weightChangeKg =
    first != null && last != null
      ? Math.round((last - first) * 10) / 10
      : null
  return { weightPoints: points, weightChangeKg, weightPeriodDays: periodDays }
}

export const pickLatestMeasurements = (rows: AnalyticsMetricsRow[]) => {
  const latest = rows[0]
  if (!latest) {
    return {
      waistCm: null,
      hipsCm: null,
      chestCm: null,
      armCm: null,
      loggedAt: null,
    }
  }
  return {
    waistCm: latest.waist_cm,
    hipsCm: latest.hip_cm,
    chestCm: latest.chest_cm,
    armCm: latest.arm_cm,
    loggedAt: latest.logged_at,
  }
}

export const pickLatestMeasurementNotes = (rows: AnalyticsMetricsRow[]) => {
  for (const row of rows) {
    const notes = row.notes?.trim()
    if (notes) return notes
  }
  return null
}

/** Chronological spark values (oldest → newest) for measurement tiles. */
export const buildMeasurementSparks = (rows: AnalyticsMetricsRow[]) => {
  const chron = [...rows].reverse()
  const series = (pick: (r: AnalyticsMetricsRow) => number | null) =>
    chron.map(pick).filter((v): v is number => v != null)
  return {
    waist: series((r) => r.waist_cm),
    hips: series((r) => r.hip_cm),
    chest: series((r) => r.chest_cm),
    arm: series((r) => r.arm_cm),
  }
}

export const groupProgressPhotos = (
  rows: AnalyticsPhotoRow[],
  signedUrls: Record<string, string | null>
): PhotoCheckIn[] => {
  const byId = new Map<string, PhotoCheckIn>()
  for (const row of rows) {
    const loggedAt = row.body_metrics?.logged_at ?? row.created_at
    const existing = byId.get(row.body_metrics_id) ?? {
      bodyMetricsId: row.body_metrics_id,
      loggedAt,
      photos: [] as ProgressPhoto[],
    }
    existing.photos.push({
      pose: row.pose,
      url: signedUrls[row.storage_path] ?? null,
    })
    byId.set(row.body_metrics_id, existing)
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  )
}

export type VolumeWeek = {
  weekStart: string
  label: string
  sets: number
}

/** Bucket set counts into the last `weekCount` Sunday-start weeks (oldest → newest). */
export const buildTrainingVolumeWeeks = (
  rows: { logged_at: string; set_count: number }[],
  weekCount: number,
  now = new Date()
): VolumeWeek[] => {
  const weeks: VolumeWeek[] = []
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const day = start.getUTCDay() // 0 = Sunday
  start.setUTCDate(start.getUTCDate() - day - (weekCount - 1) * 7)

  for (let i = 0; i < weekCount; i++) {
    const weekStart = new Date(start)
    weekStart.setUTCDate(start.getUTCDate() + i * 7)
    const iso = weekStart.toISOString().slice(0, 10)
    weeks.push({
      weekStart: iso,
      label: `W${i + 1}`,
      sets: 0,
    })
  }

  for (const row of rows) {
    const d = new Date(row.logged_at)
    if (Number.isNaN(d.getTime())) continue
    const sunday = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
    const key = sunday.toISOString().slice(0, 10)
    const bucket = weeks.find((w) => w.weekStart === key)
    if (bucket) bucket.sets += row.set_count
  }

  return weeks
}

export const pickLatestTwoCheckins = (
  rows: CheckinCompareRow[]
): [CheckinCompareRow | null, CheckinCompareRow | null] => [
  rows[0] ?? null,
  rows[1] ?? null,
]
