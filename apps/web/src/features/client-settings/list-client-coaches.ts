"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
export type ClientCoachRow = {
  relationshipId: string
  coachId: string
  displayName: string
  since: string
}

export type ListClientCoachesResult = {
  coaches: ClientCoachRow[]
  loadFailed: boolean
}

export const listClientCoachesForUser = async (): Promise<ClientCoachRow[]> => {
  const result = await listClientCoachesResult()
  return result.coaches
}

export const listClientCoachesResult = async (): Promise<ListClientCoachesResult> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc("list_client_coaches")

  if (error || !data || typeof data !== "object") {
    return { coaches: [], loadFailed: true }
  }

  const payload = data as Record<string, unknown>
  if (payload.success !== true || !Array.isArray(payload.coaches)) {
    return { coaches: [], loadFailed: true }
  }

  const coaches = payload.coaches
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const relationshipId = String(row.relationship_id ?? "")
      const coachId = String(row.coach_id ?? "")
      if (!relationshipId || !coachId) return null
      return {
        relationshipId,
        coachId,
        displayName: String(row.display_name ?? "Coach"),
        since: String(row.since ?? ""),
      }
    })
    .filter((row): row is ClientCoachRow => row !== null)

  return { coaches, loadFailed: false }
}

