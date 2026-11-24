"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { PlaceType, CoachLocation } from "./location-types"
import { listCoachLocations } from "./location-queries"

type AddLocationInput = {
  name: string
  placeType: PlaceType
  addressLine1?: string
  city?: string
}

export const addCoachLocation = async (
  input: AddLocationInput
): Promise<{ success: boolean; locations: CoachLocation[] }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, locations: [] }

  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  const normalizedKey = `${slug}-${Date.now().toString(36)}`

  const { data: place, error: placeError } = await supabase
    .from("places")
    .insert({
      name: input.name.trim(),
      place_type: input.placeType,
      address_line1: input.addressLine1?.trim() || null,
      city: input.city?.trim() || null,
      normalized_key: normalizedKey,
    })
    .select("id")
    .single()

  if (placeError || !place) return { success: false, locations: [] }

  const { error: linkError } = await supabase.from("coach_places").insert({
    coach_id: user.id,
    place_id: place.id,
    is_primary: false,
    sort_order: 0,
  })

  if (linkError) return { success: false, locations: [] }

  const { locations } = await listCoachLocations()
  return { success: true, locations }
}

export const removeCoachLocation = async (
  coachPlaceId: string
): Promise<{ success: boolean; locations: CoachLocation[] }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, locations: [] }

  const { error } = await supabase
    .from("coach_places")
    .delete()
    .eq("id", coachPlaceId)
    .eq("coach_id", user.id)

  if (error) return { success: false, locations: [] }

  const { locations } = await listCoachLocations()
  return { success: true, locations }
}
