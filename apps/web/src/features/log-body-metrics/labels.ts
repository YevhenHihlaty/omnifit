import { PROGRESS_PHOTO_POSES, type ProgressPhotoPose } from "./types"

export type LogBodyMetricsLabels = {
  title: string
  subtitle: string
  weightCardTitle: string
  circumferencesTitle: string
  weightLabel: string
  weightUnit: string
  chestLabel: string
  waistLabel: string
  hipsLabel: string
  armLabel: string
  thighLabel: string
  cmUnit: string
  notesLabel: string
  notesPlaceholder: string
  photosTitle: string
  photosRequired: string
  photosHint: string
  dropHint: string
  clearPhoto: string
  poses: Record<ProgressPhotoPose, string>
  choosePhoto: string
  photoSelected: string
  save: string
  saving: string
  saved: string
  saveFailed: string
  incompleteHint: string
  photoTooLarge: string
  photoBadType: string
  loadFailed: string
  recentTitle: string
  recentEmpty: string
}

export const buildLogBodyMetricsLabels = (
  t: (key: string) => string
): LogBodyMetricsLabels => {
  const poses = Object.fromEntries(
    PROGRESS_PHOTO_POSES.map((pose) => [
      pose,
      t(`logBody.poses.${pose}`),
    ])
  ) as Record<ProgressPhotoPose, string>

  return {
    title: t("logBody.title"),
    subtitle: t("logBody.subtitle"),
    weightCardTitle: t("logBody.weightCardTitle"),
    circumferencesTitle: t("logBody.circumferencesTitle"),
    weightLabel: t("logBody.weightLabel"),
    weightUnit: t("logBody.weightUnit"),
    chestLabel: t("logBody.chestLabel"),
    waistLabel: t("logBody.waistLabel"),
    hipsLabel: t("logBody.hipsLabel"),
    armLabel: t("logBody.armLabel"),
    thighLabel: t("logBody.thighLabel"),
    cmUnit: t("logBody.cmUnit"),
    notesLabel: t("logBody.notesLabel"),
    notesPlaceholder: t("logBody.notesPlaceholder"),
    photosTitle: t("logBody.photosTitle"),
    photosRequired: t("logBody.photosRequired"),
    photosHint: t("logBody.photosHint"),
    dropHint: t("logBody.dropHint"),
    clearPhoto: t("logBody.clearPhoto"),
    poses,
    choosePhoto: t("logBody.choosePhoto"),
    photoSelected: t("logBody.photoSelected"),
    save: t("logBody.save"),
    saving: t("logBody.saving"),
    saved: t("logBody.saved"),
    saveFailed: t("logBody.saveFailed"),
    incompleteHint: t("logBody.incompleteHint"),
    photoTooLarge: t("logBody.photoTooLarge"),
    photoBadType: t("logBody.photoBadType"),
    loadFailed: t("logBody.loadFailed"),
    recentTitle: t("logBody.recentTitle"),
    recentEmpty: t("logBody.recentEmpty"),
  }
}
