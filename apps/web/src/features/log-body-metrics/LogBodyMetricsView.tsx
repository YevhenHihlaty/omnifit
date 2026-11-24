"use client"

import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react"
import { saveBodyMetricsWithPhotos } from "./actions"
import { isBodyMetricsLogComplete } from "./completion"
import type { LogBodyMetricsLabels } from "./labels"
import { validateProgressPhotoFile } from "./photo-validate"
import {
  emptyBodyMeasurements,
  PROGRESS_PHOTO_POSES,
  type LogBodyMetricsDraft,
  type LogBodyMetricsPageData,
  type ProgressPhotoPose,
} from "./types"

type LogBodyMetricsViewProps = {
  initialData: LogBodyMetricsPageData
  labels: LogBodyMetricsLabels
  loadFailed?: boolean
}

const CameraIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="28"
    height="28"
    aria-hidden
  >
    <path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export const LogBodyMetricsView = ({
  initialData,
  labels,
  loadFailed = false,
}: LogBodyMetricsViewProps) => {
  const [measurements, setMeasurements] = useState(emptyBodyMeasurements)
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState<
    Partial<Record<ProgressPhotoPose, File | null>>
  >({})
  const [previews, setPreviews] = useState<
    Partial<Record<ProgressPhotoPose, string>>
  >({})
  const [photoErrors, setPhotoErrors] = useState<
    Partial<Record<ProgressPhotoPose, string>>
  >({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<"success" | "error">("success")
  const [isSaving, startSave] = useTransition()

  useEffect(() => {
    return () => {
      for (const url of Object.values(previews)) {
        if (url) URL.revokeObjectURL(url)
      }
    }
  }, [previews])

  const draft: LogBodyMetricsDraft = useMemo(
    () => ({
      measurements,
      photos: {
        front: Boolean(files.front),
        side: Boolean(files.side),
        back: Boolean(files.back),
      },
      notes,
    }),
    [measurements, files, notes]
  )

  const complete = isBodyMetricsLogComplete(draft)

  const mapSaveError = (code: string) => {
    if (code === "missing_photo") return labels.incompleteHint
    if (code === "photo_too_large") return labels.photoTooLarge
    if (code === "bad_photo_type") return labels.photoBadType
    return labels.saveFailed
  }

  const handlePhotoChange = (pose: ProgressPhotoPose, file: File | null) => {
    const error = validateProgressPhotoFile(file)
    if (error === "tooLarge") {
      setPhotoErrors((current) => ({
        ...current,
        [pose]: labels.photoTooLarge,
      }))
      setFiles((current) => ({ ...current, [pose]: null }))
      setPreviews((current) => {
        const prev = current[pose]
        if (prev) URL.revokeObjectURL(prev)
        const next = { ...current }
        delete next[pose]
        return next
      })
      return
    }
    if (error === "badType") {
      setPhotoErrors((current) => ({
        ...current,
        [pose]: labels.photoBadType,
      }))
      setFiles((current) => ({ ...current, [pose]: null }))
      setPreviews((current) => {
        const prev = current[pose]
        if (prev) URL.revokeObjectURL(prev)
        const next = { ...current }
        delete next[pose]
        return next
      })
      return
    }
    setPhotoErrors((current) => {
      const next = { ...current }
      delete next[pose]
      return next
    })
    setFiles((current) => ({ ...current, [pose]: file }))
    setPreviews((current) => {
      const prev = current[pose]
      if (prev) URL.revokeObjectURL(prev)
      if (!file) {
        const next = { ...current }
        delete next[pose]
        return next
      }
      return { ...current, [pose]: URL.createObjectURL(file) }
    })
  }

  const handleDrop = (pose: ProgressPhotoPose, event: DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0] ?? null
    handlePhotoChange(pose, file)
  }

  const handleSave = () => {
    if (!complete) {
      setStatusKind("error")
      setStatusMessage(labels.incompleteHint)
      return
    }

    startSave(async () => {
      const formData = new FormData()
      formData.set("weight_kg", measurements.weightKg.trim())
      formData.set("chest_cm", measurements.chestCm.trim())
      formData.set("waist_cm", measurements.waistCm.trim())
      formData.set("hip_cm", measurements.hipCm.trim())
      formData.set("arm_cm", measurements.armCm.trim())
      formData.set("notes", notes)
      for (const pose of PROGRESS_PHOTO_POSES) {
        const file = files[pose]
        if (file) formData.set(`photo_${pose}`, file)
      }

      const result = await saveBodyMetricsWithPhotos(formData)
      if (!result.success) {
        setStatusKind("error")
        setStatusMessage(mapSaveError(result.error))
        return
      }

      setStatusKind("success")
      setStatusMessage(labels.saved)
      setMeasurements(emptyBodyMeasurements())
      setNotes("")
      setFiles({})
      setPreviews((current) => {
        for (const url of Object.values(current)) {
          if (url) URL.revokeObjectURL(url)
        }
        return {}
      })
      setPhotoErrors({})
    })
  }

  const circumferenceFields = [
    ["waistCm", labels.waistLabel],
    ["hipCm", labels.hipsLabel],
    ["chestCm", labels.chestLabel],
    ["armCm", labels.armLabel],
  ] as const

  return (
    <div className="mx-auto max-w-[1160px]">
      <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900">
        {labels.title}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-500">{labels.subtitle}</p>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          className={`mt-4 text-sm ${statusKind === "error" ? "text-danger" : "text-pine-dark"}`}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-stone-300 bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {labels.weightCardTitle}
          </h2>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">
              {labels.weightLabel} *
            </span>
            <div className="relative">
              <input
                type="number"
                min={20}
                max={500}
                step={0.1}
                value={measurements.weightKg}
                onChange={(e) =>
                  setMeasurements((current) => ({
                    ...current,
                    weightKg: e.target.value,
                  }))
                }
                className="h-[46px] w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-[14px] pr-12 text-[14.5px] tabular-nums focus:border-pine focus:outline-none focus:ring-[3px] focus:ring-pine-tint"
                required
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-500">{labels.weightUnit}</span>
            </div>
          </label>

          <div className="my-5 border-t border-stone-150" />
          <p className="mb-3 text-sm font-semibold text-ink-700">
            {labels.circumferencesTitle}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {circumferenceFields.map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">
                  {label}
                </span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={measurements[key]}
                    onChange={(e) =>
                      setMeasurements((current) => ({
                        ...current,
                        [key]: e.target.value,
                      }))
                    }
                    className="h-[46px] w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-[14px] pr-12 text-[14.5px] tabular-nums focus:border-pine focus:outline-none focus:ring-[3px] focus:ring-pine-tint"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-500">{labels.cmUnit}</span>
                </div>
              </label>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-900">
              {labels.notesLabel}
            </span>
            <textarea
              value={notes}
              placeholder={labels.notesPlaceholder}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 py-2 text-sm"
            />
          </label>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-stone-300 bg-surface p-6">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {labels.photosTitle}{" "}
              <span className="font-normal text-danger">
                {labels.photosRequired}
              </span>
            </h2>
            <p className="mt-1 text-sm text-ink-500">{labels.photosHint}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {PROGRESS_PHOTO_POSES.map((pose) => {
                const selected = Boolean(files[pose])
                const preview = previews[pose]
                return (
                  <label
                    key={pose}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(pose, e)}
                    className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[12px] border-[1.5px] border-dashed p-3 text-center transition-colors ${
                      selected
                        ? "border-pine bg-pine-tint"
                        : "border-stone-300 bg-stone-150 hover:border-pine"
                    }`}
                  >
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span className="relative z-10 rounded bg-ink-900/70 px-2 py-0.5 text-xs font-semibold text-cream">
                          {labels.poses[pose]}
                        </span>
                        <button
                          type="button"
                          className="relative z-10 mt-2 rounded bg-surface/90 px-2 py-1 text-xs font-semibold text-ink-900"
                          onClick={(e) => {
                            e.preventDefault()
                            handlePhotoChange(pose, null)
                          }}
                        >
                          {labels.clearPhoto}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-ink-500">
                          <CameraIcon />
                        </span>
                        <span className="mt-2 text-sm font-semibold text-ink-900">
                          {labels.poses[pose]}
                        </span>
                        <span className="mt-1 text-xs text-ink-500">
                          {labels.dropHint}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      aria-label={labels.poses[pose]}
                      onChange={(e) =>
                        handlePhotoChange(pose, e.target.files?.[0] ?? null)
                      }
                    />
                    {photoErrors[pose] ? (
                      <span
                        className="relative z-10 mt-2 text-xs text-danger"
                        role="alert"
                      >
                        {photoErrors[pose]}
                      </span>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </section>

          {!complete ? (
            <div className="flex items-start gap-2 rounded-[10px] bg-warning-tint px-3.5 py-[10px] text-sm font-semibold text-warning">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
              {labels.incompleteHint}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={!complete || isSaving}
            title={complete ? undefined : labels.incompleteHint}
            className={`h-12 w-full rounded-[10px] text-[15px] font-semibold ${
              complete
                ? "bg-pine text-surface hover:bg-pine-dark"
                : "cursor-not-allowed bg-stone-150 text-ink-500"
            }`}
          >
            {isSaving ? labels.saving : labels.save}
          </button>

          <section className="rounded-2xl border border-stone-300 bg-surface p-6">
            <h2 className="font-display text-[15px] font-semibold text-ink-900">
              {labels.recentTitle}
            </h2>
            {initialData.recent.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">{labels.recentEmpty}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                {initialData.recent.map((row) => (
                  <li key={row.id}>
                    {row.loggedAt.slice(0, 10)}
                    {row.weightKg != null
                      ? ` · ${row.weightKg} ${labels.weightUnit}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
