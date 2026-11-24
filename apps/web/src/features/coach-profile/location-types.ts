export type PlaceType = "gym" | "studio" | "park" | "outdoor" | "online" | "other"

export type CoachLocation = {
  coachPlaceId: string
  placeId: string
  name: string
  placeType: PlaceType
  addressLine1: string | null
  city: string | null
  isPrimary: boolean
  customLabel: string | null
}
