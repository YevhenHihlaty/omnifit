"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { CoachLocation, PlaceType } from "./location-types"

export const listCoachLocations = async (): Promise<{
  locations: CoachLocation[]
  loadFailed: boolean
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { locations: [], loadFailed: false }

  const { data, error } = await supabase
    .from("coach_places")
    .select(
      "id, place_id, is_primary, custom_label, sort_order, places(name, place_type, address_line1, city)"
    )
    .eq("coach_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) return { locations: [], loadFailed: true }

  const locations: CoachLocation[] = (data ?? []).map((row) => {
    const place = Array.isArray(row.places) ? row.places[0] : (row.places as { name: string; place_type: string; address_line1: string | null; city: string | null } | null)
    return {
      coachPlaceId: row.id,
      placeId: row.place_id,
      name: place?.name ?? "",
      placeType: (place?.place_type ?? "other") as PlaceType,
      addressLine1: place?.address_line1 ?? null,
      city: place?.city ?? null,
      isPrimary: row.is_primary === true,
      customLabel: row.custom_label ?? null,
    }
  })

  return { locations, loadFailed: false }
}
