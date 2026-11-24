"use client"

import { useState, useTransition } from "react"
import { addCoachLocation, removeCoachLocation } from "./location-actions"
import type { CoachLocation, PlaceType } from "./location-types"

export type CoachLocationsPanelLabels = {
  title: string
  subtitle: string
  addLocation: string
  locationNameLabel: string
  locationAddressLabel: string
  locationCityLabel: string
  locationTypeLabel: string
  locationPrimary: string
  locationRemove: string
  locationsEmpty: string
  locationSave: string
  locationSaving: string
  locationCancel: string
  locationTypeGym: string
  locationTypeStudio: string
  locationTypePark: string
  locationTypeOutdoor: string
  locationTypeOnline: string
  locationTypeOther: string
  locationAddFailed: string
  locationRemoveFailed: string
}

type CoachLocationsPanelProps = {
  locations: CoachLocation[]
  labels: CoachLocationsPanelLabels
}

const PLACE_TYPE_ICONS: Record<PlaceType, string> = {
  gym: "🏋️",
  studio: "🏟️",
  park: "🌳",
  outdoor: "🏞️",
  online: "💻",
  other: "📍",
}

export const CoachLocationsPanel = ({
  locations: initial,
  labels,
}: CoachLocationsPanelProps) => {
  const [locations, setLocations] = useState<CoachLocation[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [placeType, setPlaceType] = useState<PlaceType>("gym")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [isPending, startTransition] = useTransition()

  const typeOptions: { value: PlaceType; label: string }[] = [
    { value: "gym", label: labels.locationTypeGym },
    { value: "studio", label: labels.locationTypeStudio },
    { value: "park", label: labels.locationTypePark },
    { value: "outdoor", label: labels.locationTypeOutdoor },
    { value: "online", label: labels.locationTypeOnline },
    { value: "other", label: labels.locationTypeOther },
  ]

  const handleAdd = () => {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await addCoachLocation({
        name: name.trim(),
        placeType,
        addressLine1: address,
        city,
      })
      if (!result.success) {
        setError(labels.locationAddFailed)
        return
      }
      setLocations(result.locations)
      setShowAdd(false)
      setName("")
      setAddress("")
      setCity("")
      setPlaceType("gym")
    })
  }

  const handleRemove = (coachPlaceId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await removeCoachLocation(coachPlaceId)
      if (!result.success) {
        setError(labels.locationRemoveFailed)
        return
      }
      setLocations(result.locations)
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-[19px] font-bold text-ink-900">{labels.title}</h2>
          <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        {!showAdd ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-[9px] bg-ink-900 px-4 text-sm font-semibold text-cream hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/60"
          >
            {labels.addLocation}
          </button>
        ) : null}
      </div>

      {showAdd ? (
        <div className="mt-6 rounded-[14px] border border-stone-300 bg-surface p-5">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">
                {labels.locationNameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[9px] border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
                placeholder="e.g. Downtown Fitness Club"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">
                {labels.locationTypeLabel}
              </label>
              <select
                value={placeType}
                onChange={(e) => setPlaceType(e.target.value as PlaceType)}
                disabled={isPending}
                className="w-full rounded-[9px] border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-ink-900 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">
                {labels.locationAddressLabel}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-[9px] border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
                placeholder="123 Main St"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-ink-900">
                {labels.locationCityLabel}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-[9px] border border-stone-300 bg-surface px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
                placeholder="New York"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending || !name.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-[9px] bg-ink-900 px-4 text-sm font-semibold text-cream hover:bg-ink-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/60"
            >
              {isPending ? labels.locationSaving : labels.locationSave}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false)
                setName("")
                setAddress("")
                setCity("")
                setPlaceType("gym")
                setError(null)
              }}
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center rounded-[9px] border border-stone-300 px-4 text-sm font-medium text-ink-700 hover:bg-stone-100 disabled:opacity-50"
            >
              {labels.locationCancel}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {locations.length === 0 && !showAdd ? (
        <p className="mt-6 text-sm text-ink-500">{labels.locationsEmpty}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {locations.map((loc) => (
            <li
              key={loc.coachPlaceId}
              className="flex items-center gap-4 rounded-[14px] border border-stone-300 bg-surface p-4"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pine-tint text-lg"
                aria-hidden
              >
                {PLACE_TYPE_ICONS[loc.placeType]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">
                    {loc.customLabel ?? loc.name}
                  </span>
                  {loc.isPrimary ? (
                    <span className="rounded-full bg-pine-tint px-2.5 py-0.5 text-[11px] font-semibold text-pine-dark">
                      {labels.locationPrimary}
                    </span>
                  ) : null}
                </div>
                {loc.addressLine1 || loc.city ? (
                  <p className="mt-0.5 truncate text-[13px] text-ink-500">
                    {[loc.addressLine1, loc.city].filter(Boolean).join(", ")}
                  </p>
                ) : null}
              </div>
              {!loc.isPrimary ? (
                <button
                  type="button"
                  onClick={() => handleRemove(loc.coachPlaceId)}
                  disabled={isPending}
                  className="shrink-0 rounded-[7px] border border-stone-300 px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:border-danger hover:text-danger disabled:opacity-50"
                >
                  {labels.locationRemove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
