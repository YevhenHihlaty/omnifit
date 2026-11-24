/** Client-side photo gate — convert to WebP later if needed. */
export const MAX_PROGRESS_PHOTO_BYTES = 2 * 1024 * 1024

export const ALLOWED_PROGRESS_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type PhotoValidationError = "tooLarge" | "badType" | "missing"

export const validateProgressPhotoFile = (
  file: File | null
): PhotoValidationError | null => {
  if (!file) return "missing"
  if (
    !(ALLOWED_PROGRESS_PHOTO_TYPES as readonly string[]).includes(file.type)
  ) {
    return "badType"
  }
  if (file.size > MAX_PROGRESS_PHOTO_BYTES) return "tooLarge"
  return null
}

export const extensionForMime = (mime: string): string => {
  if (mime === "image/png") return "png"
  if (mime === "image/webp") return "webp"
  return "jpg"
}
