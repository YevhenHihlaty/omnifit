"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import {
  extensionForMime,
  MAX_PROGRESS_PHOTO_BYTES,
  ALLOWED_PROGRESS_PHOTO_TYPES,
} from "./photo-validate"
import { logBodyMetricsSchema } from "./schemas"
import { PROGRESS_PHOTO_POSES, type ProgressPhotoPose } from "./types"

export type ActionResult =
  | { success: true; metricId: string }
  | { success: false; error: string }

const parseOptionalCm = (raw: FormDataEntryValue | null): number | undefined => {
  if (raw == null || String(raw).trim() === "") return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

const rollbackBodyMetric = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  metricId: string,
  uploadedPaths: string[]
) => {
  if (uploadedPaths.length > 0) {
    await supabase.storage.from("progress-photos").remove(uploadedPaths)
  }
  await supabase
    .from("body_metrics")
    .delete()
    .eq("id", metricId)
    .eq("client_id", userId)
}

export const saveBodyMetricsWithPhotos = async (
  formData: FormData
): Promise<ActionResult> => {
  const parsed = logBodyMetricsSchema.safeParse({
    weight_kg: Number(formData.get("weight_kg")),
    chest_cm: parseOptionalCm(formData.get("chest_cm")),
    waist_cm: parseOptionalCm(formData.get("waist_cm")),
    hip_cm: parseOptionalCm(formData.get("hip_cm")),
    arm_cm: parseOptionalCm(formData.get("arm_cm")),
    thigh_cm: parseOptionalCm(formData.get("thigh_cm")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: "invalid_input" }
  }

  const files: Partial<Record<ProgressPhotoPose, File>> = {}
  for (const pose of PROGRESS_PHOTO_POSES) {
    const file = formData.get(`photo_${pose}`)
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "missing_photo" }
    }
    if (
      !(ALLOWED_PROGRESS_PHOTO_TYPES as readonly string[]).includes(file.type)
    ) {
      return { success: false, error: "bad_photo_type" }
    }
    if (file.size > MAX_PROGRESS_PHOTO_BYTES) {
      return { success: false, error: "photo_too_large" }
    }
    files[pose] = file
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data: metric, error: metricError } = await supabase
    .from("body_metrics")
    .insert({
      client_id: user.id,
      weight_kg: parsed.data.weight_kg,
      chest_cm: parsed.data.chest_cm ?? null,
      waist_cm: parsed.data.waist_cm ?? null,
      hip_cm: parsed.data.hip_cm ?? null,
      arm_cm: parsed.data.arm_cm ?? null,
      thigh_cm: parsed.data.thigh_cm ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single()

  if (metricError || !metric) {
    return { success: false, error: "save_failed" }
  }

  const photoRows: {
    body_metrics_id: string
    client_id: string
    pose: ProgressPhotoPose
    storage_path: string
  }[] = []
  const uploadedPaths: string[] = []

  for (const pose of PROGRESS_PHOTO_POSES) {
    const file = files[pose]!
    // ponytail: keep real mime extension; WebP conversion can land later
    const ext = extensionForMime(file.type)
    const storagePath = `${user.id}/${metric.id}/${pose}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("progress-photos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      await rollbackBodyMetric(supabase, user.id, metric.id, uploadedPaths)
      return { success: false, error: "upload_failed" }
    }

    uploadedPaths.push(storagePath)
    photoRows.push({
      body_metrics_id: metric.id,
      client_id: user.id,
      pose,
      storage_path: storagePath,
    })
  }

  const { error: photosError } = await supabase
    .from("progress_photos")
    .insert(photoRows)

  if (photosError) {
    await rollbackBodyMetric(supabase, user.id, metric.id, uploadedPaths)
    return { success: false, error: "save_failed" }
  }

  revalidatePath(ROUTES.clientLogBody)
  revalidatePath(ROUTES.clientProgress)
  revalidatePath(ROUTES.clientHome)
  return { success: true, metricId: metric.id }
}

/** Create a short-lived signed read URL (≤60s). */
export const createProgressPhotoSignedUrl = async (
  storagePath: string
): Promise<{ success: true; url: string } | { success: false; error: string }> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.login)

  const { data, error } = await supabase.storage
    .from("progress-photos")
    .createSignedUrl(storagePath, 3600)

  if (error || !data?.signedUrl) {
    return { success: false, error: error?.message ?? "Could not sign URL" }
  }

  return { success: true, url: data.signedUrl }
}
