/**
 * Map raw jsonb envelope rows → typed CoachClientRow[].
 * Pure — no I/O.
 */
import type { CoachClientRow, StatusBucket } from "./types"

type RawClientRow = Record<string, unknown>

const toStringOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null

const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const toStatus = (v: unknown): "active" | "archived" =>
  v === "archived" ? "archived" : "active"

const toBucket = (v: unknown): StatusBucket | null => {
  if (v === "on_track" || v === "at_risk" || v === "new") return v
  return null
}

export const parseRosterRow = (raw: RawClientRow): CoachClientRow => ({
  relationshipId: String(raw.relationship_id ?? ""),
  clientId: String(raw.client_id ?? ""),
  displayName: String(raw.display_name ?? raw.client_id ?? ""),
  avatarUrl: toStringOrNull(raw.avatar_url),
  email: String(raw.email ?? ""),
  status: toStatus(raw.status),
  since: String(raw.since ?? raw.created_at ?? ""),
  caloriesToday: toNumberOrNull(raw.calories_today),
  workoutsToday: toNumberOrNull(raw.workouts_today),
  lastCheckinOn: toStringOrNull(raw.last_checkin_on),
  lastLogOn: toStringOrNull(raw.last_log_on),
  streakDays: toNumberOrNull(raw.streak_days),
  statusBucket: toBucket(raw.status_bucket),
})

/**
 * Parse the full `list_coach_clients` JSONB envelope.
 * Returns empty array on any error — fail-closed.
 */
export const parseRosterPayload = (payload: unknown): CoachClientRow[] => {
  if (!payload || typeof payload !== "object") return []
  const p = payload as Record<string, unknown>
  if (p.success !== true) return []
  if (!Array.isArray(p.clients)) return []
  return p.clients.map((row) => parseRosterRow(row as RawClientRow))
}
