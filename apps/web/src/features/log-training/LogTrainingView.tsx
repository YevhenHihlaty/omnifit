"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { loadTemplateAsDraft, saveAsTemplate, saveWorkout } from "./actions"
import { logTrainingDraftToInput } from "./draft-to-input"
import type { LogTrainingLabels } from "./labels"
import {
  createDefaultExerciseRow,
  getSportFields,
  sanitizeRowOnSportChange,
  sportFieldRegistry,
} from "./sport-field-registry"
import {
  SPORT_TYPES,
  type LogTrainingDraft,
  type LogTrainingPageData,
  type SportType,
  type TrainingExerciseRow,
} from "./types"

type LogTrainingViewProps = {
  initialData: LogTrainingPageData
  labels: LogTrainingLabels
  loadFailed?: boolean
  /** Coach logging for a client — sets source=coach_offline. */
  onBehalfOf?: { clientId: string; clientName: string }
  /** Preload a library template once on mount. */
  initialTemplateId?: string | null
}

type StartMode = "blank" | "template"

const emptyDraft = (): LogTrainingDraft => ({
  sportType: "weight_lifting",
  durationMinutes: 45,
  notes: "",
  exercises: [createDefaultExerciseRow("weight_lifting")],
})

export const LogTrainingView = ({
  initialData,
  labels,
  loadFailed = false,
  onBehalfOf,
  initialTemplateId = null,
}: LogTrainingViewProps) => {
  const [draft, setDraft] = useState<LogTrainingDraft>(emptyDraft)
  const [templates, setTemplates] = useState(initialData.templates)
  const [startMode, setStartMode] = useState<StartMode>("blank")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<"success" | "error">("success")
  const [isSaving, startSave] = useTransition()
  const [isLoadingTemplate, startLoadTemplate] = useTransition()
  const didAutoLoad = useRef(false)

  const registry = sportFieldRegistry[draft.sportType]
  const fields = getSportFields(draft.sportType)
  const title = onBehalfOf
    ? labels.onBehalfTitle.replace("{name}", onBehalfOf.clientName)
    : labels.title
  const subtitle = onBehalfOf ? labels.onBehalfSubtitle : labels.subtitle

  const mapSaveError = (code: string) => {
    if (code === "template_not_found") return labels.templateNotFound
    if (code === "forbidden") return labels.saveFailed
    return labels.saveFailed
  }

  const handleLoadTemplate = (templateId: string) => {
    startLoadTemplate(async () => {
      const result = await loadTemplateAsDraft(templateId)
      if (!result.success) {
        setStatusKind("error")
        setStatusMessage(mapSaveError(result.error))
        return
      }
      setDraft(result.draft)
      setStartMode("template")
      setStatusMessage(null)
    })
  }

  useEffect(() => {
    if (!initialTemplateId || didAutoLoad.current) return
    didAutoLoad.current = true
    handleLoadTemplate(initialTemplateId)
    // ponytail: load once from library Use → client log deep-link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId])


  const handleSportChange = (sport: SportType) => {
    setDraft((current) => ({
      ...current,
      sportType: sport,
      exercises: current.exercises.map((row) =>
        sanitizeRowOnSportChange(row, sport)
      ),
    }))
    setStatusMessage(null)
  }

  const handleAddExercise = () => {
    setDraft((current) => ({
      ...current,
      exercises: [...current.exercises, createDefaultExerciseRow(current.sportType)],
    }))
  }

  const handleRemoveExercise = (id: string) => {
    setDraft((current) => ({
      ...current,
      exercises:
        current.exercises.length <= 1
          ? current.exercises
          : current.exercises.filter((row) => row.id !== id),
    }))
  }

  const handleUpdateRow = (
    id: string,
    patch: Partial<TrainingExerciseRow>
  ) => {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }))
  }

  const validateDraft = (): string | null => {
    if (draft.exercises.length === 0) return labels.validation.noExercises
    for (const row of draft.exercises) {
      if (!row.exerciseName.trim()) return labels.validation.exerciseName
      const key = registry.validateRow(row)
      if (key === "repsRequired") return labels.validation.repsRequired
      if (key === "metricRequired") return labels.validation.metricRequired
      if (key === "distanceOrDuration") {
        return labels.validation.distanceOrDuration
      }
    }
    return null
  }

  const handleSave = () => {
    const validationError = validateDraft()
    if (validationError) {
      setStatusKind("error")
      setStatusMessage(validationError)
      return
    }

    startSave(async () => {
      const clientId = onBehalfOf?.clientId ?? "self"
      const source = onBehalfOf ? "coach_offline" : "client_self"
      const input = logTrainingDraftToInput(draft, clientId, source)
      const result = await saveWorkout({
        sportType: draft.sportType,
        durationMinutes: draft.durationMinutes,
        notes: draft.notes,
        sets: input.sets,
        onBehalfOf: onBehalfOf?.clientId,
      })
      if (!result.success) {
        setStatusKind("error")
        setStatusMessage(mapSaveError(result.error))
        return
      }
      setStatusKind("success")
      setStatusMessage(labels.saved)
      setDraft(emptyDraft())
      setStartMode("blank")
    })
  }

  const handleSaveTemplate = () => {
    const name = templateName.trim()
    if (!name) return
    const validationError = validateDraft()
    if (validationError) {
      setStatusKind("error")
      setStatusMessage(validationError)
      return
    }

    startSave(async () => {
      const result = await saveAsTemplate({
        name,
        sportType: draft.sportType,
        notes: draft.notes,
        exercises: draft.exercises,
        ownerRole: onBehalfOf ? "coach" : "client",
      })
      if (!result.success || !result.templateId) {
        setStatusKind("error")
        setStatusMessage(mapSaveError(result.success ? "save_failed" : result.error))
        return
      }
      setTemplates((current) => [
        {
          id: result.templateId!,
          name,
          sportType: draft.sportType,
          exerciseCount: draft.exercises.length,
          lastUsedAt: null,
        },
        ...current,
      ])
      setShowSaveTemplate(false)
      setTemplateName("")
      setStatusKind("success")
      setStatusMessage(labels.templateSaved)
    })
  }

  return (
    <div className="mx-auto max-w-[960px] pb-28">
      <h1 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
        {title}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-500">{subtitle}</p>

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

      <div className="mt-8">
        <div className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-900">
              {labels.sportLabel}
            </legend>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={labels.sportLabel}
            >
              {SPORT_TYPES.map((sport) => {
                const active = draft.sportType === sport
                return (
                  <button
                    key={sport}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSportChange(sport)}
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-ink-900 bg-ink-900 text-cream"
                        : "border-stone-300 bg-surface text-ink-700 hover:border-ink-900"
                    }`}
                  >
                    {labels.sports[sport]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={labels.startModeLabel}
          >
            {(
              [
                ["blank", labels.startBlank],
                ["template", labels.startTemplate],
              ] as const
            ).map(([mode, label]) => {
              const active = startMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStartMode(mode)}
                  className={`rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-pine bg-pine-tint text-pine-dark"
                      : "border-stone-300 bg-surface text-ink-700 hover:border-pine"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {startMode === "template" ? (
            <section className="rounded-2xl border border-stone-300 bg-surface p-4">
              <h2 className="font-display text-[15px] font-semibold text-ink-900">
                {labels.templatesTitle}
              </h2>
              {templates.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">{labels.templatesEmpty}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {templates.map((template) => (
                    <li key={template.id}>
                      <button
                        type="button"
                        disabled={isLoadingTemplate}
                        onClick={() => handleLoadTemplate(template.id)}
                        className="w-full rounded-[10px] border border-stone-150 px-3 py-2.5 text-left hover:border-pine disabled:opacity-60"
                        aria-label={`${labels.loadTemplate}: ${template.name}`}
                      >
                        <span className="block text-sm font-semibold text-ink-900">
                          {template.name}
                        </span>
                        <span className="text-xs text-ink-500">
                          {labels.sports[template.sportType]} ·{" "}
                          {template.exerciseCount}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-900">
              {labels.durationLabel}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={600}
                value={draft.durationMinutes || ""}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    durationMinutes: Number(e.target.value) || 0,
                  }))
                }
                className="h-10 w-28 rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
              />
              <span className="text-sm text-ink-500">{labels.durationUnit}</span>
            </div>
          </label>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {labels.exercisesTitle}
              </h2>
              {draft.sportType !== "weight_lifting" ? (
                <button
                  type="button"
                  onClick={handleAddExercise}
                  className="text-sm font-semibold text-pine-dark hover:underline"
                >
                  {labels.addExercise}
                </button>
              ) : null}
            </div>

            {draft.sportType === "weight_lifting" ? (
              <div>
                <div className="mb-1.5 grid grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr_auto] gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-500">
                  <span>{labels.exerciseNameLabel}</span>
                  <span className="text-center">{labels.setsLabel}</span>
                  <span className="text-center">{labels.fields.reps}</span>
                  <span className="text-center">{labels.fields.weight}</span>
                  <span className="w-8" />
                </div>
                <ul className="space-y-1.5">
                  {draft.exercises.map((row) => (
                    <li
                      key={row.id}
                      className="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.9fr_auto] items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={row.exerciseName}
                        placeholder={labels.exerciseNamePlaceholder}
                        aria-label={labels.exerciseNameLabel}
                        onChange={(e) =>
                          handleUpdateRow(row.id, {
                            exerciseName: e.target.value,
                          })
                        }
                        className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-2 text-sm"
                      />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={row.sets}
                        aria-label={labels.setsLabel}
                        onChange={(e) =>
                          handleUpdateRow(row.id, {
                            sets: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-2 text-center text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.reps ?? ""}
                        aria-label={labels.fields.reps}
                        onChange={(e) =>
                          handleUpdateRow(row.id, {
                            reps:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-2 text-center text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={row.weightKg ?? ""}
                        aria-label={labels.fields.weight}
                        onChange={(e) =>
                          handleUpdateRow(row.id, {
                            weightKg:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                        className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-2 text-center text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(row.id)}
                        className="flex h-10 w-8 items-center justify-center text-ink-500 hover:text-danger"
                        aria-label={labels.removeExercise}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={handleAddExercise}
                  className="mt-2 flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-stone-300 text-sm font-semibold text-pine-dark hover:border-pine"
                >
                  {labels.addExercise}
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {draft.exercises.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-stone-300 bg-surface p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-end gap-3">
                      <label className="min-w-[200px] flex-1">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-500">
                          {labels.exerciseNameLabel}
                        </span>
                        <input
                          type="text"
                          value={row.exerciseName}
                          placeholder={labels.exerciseNamePlaceholder}
                          onChange={(e) =>
                            handleUpdateRow(row.id, {
                              exerciseName: e.target.value,
                            })
                          }
                          className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                        />
                      </label>
                      {registry.showSetsCount ? (
                        <label className="w-24">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-500">
                            {labels.setsLabel}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={row.sets}
                            onChange={(e) =>
                              handleUpdateRow(row.id, {
                                sets: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                          />
                        </label>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(row.id)}
                        className="h-10 text-sm font-semibold text-ink-500 hover:text-danger"
                        aria-label={labels.removeExercise}
                      >
                        {labels.removeExercise}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {fields.map((field) => (
                        <label key={field.key} className="block">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-500">
                            {labels.fields[field.labelKey] ?? field.labelKey}
                          </span>
                          <input
                            type={field.kind === "number" ? "number" : "text"}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={
                              row[field.draftKey] == null
                                ? ""
                                : String(row[field.draftKey])
                            }
                            onChange={(e) => {
                              const raw = e.target.value
                              if (field.kind === "text") {
                                handleUpdateRow(row.id, {
                                  [field.draftKey]: raw || null,
                                } as Partial<TrainingExerciseRow>)
                                return
                              }
                              handleUpdateRow(row.id, {
                                [field.draftKey]:
                                  raw === "" ? null : Number(raw),
                              } as Partial<TrainingExerciseRow>)
                            }}
                            className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-900">
              {labels.notesLabel}
            </span>
            <textarea
              value={draft.notes}
              placeholder={labels.notesPlaceholder}
              onChange={(e) =>
                setDraft((current) => ({ ...current, notes: e.target.value }))
              }
              rows={3}
              className="w-full rounded-[9px] border-[1.5px] border-stone-300 bg-surface px-3 py-2 text-sm"
            />
          </label>

          {showSaveTemplate ? (
            <div className="rounded-2xl border border-stone-300 bg-surface p-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  {labels.templateNameLabel}
                </span>
                <input
                  type="text"
                  value={templateName}
                  placeholder={labels.templateNamePlaceholder}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="h-10 w-full rounded-[9px] border-[1.5px] border-stone-300 px-3 text-sm"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isSaving || !templateName.trim()}
                  className="rounded-[10px] bg-pine px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
                >
                  {labels.saveTemplate}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveTemplate(false)}
                  className="rounded-[10px] px-4 py-2 text-sm font-semibold text-ink-500"
                >
                  {labels.cancel}
                </button>
              </div>
            </div>
          ) : null}
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-300 bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:left-[var(--of-sidebar-w)]">
        <div className="mx-auto flex max-w-[960px] items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="h-12 rounded-[10px] border-[1.5px] border-stone-300 px-5 text-sm font-semibold text-ink-700 hover:bg-stone-100"
          >
            {labels.cancel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-12 flex-1 rounded-[10px] bg-pine text-sm font-semibold text-cream hover:bg-pine-dark disabled:opacity-60"
          >
            {isSaving ? labels.saving : labels.saveWorkout}
          </button>
          <button
            type="button"
            onClick={() => setShowSaveTemplate(true)}
            className="h-10 sm:h-12 rounded-[10px] px-4 text-sm font-semibold text-pine-dark hover:underline"
          >
            {labels.saveAsTemplate}
          </button>
        </div>
      </div>
    </div>
  )
}
