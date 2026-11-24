"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, Input } from "@omnifit/ui"
import {
  archiveDailyHabit,
  createDailyHabit,
  upsertClientNutritionTarget,
} from "./plan-actions"

export type ClientPlanEditorLabels = {
  title: string
  nutritionTitle: string
  caloriesLabel: string
  proteinLabel: string
  carbsLabel: string
  fatLabel: string
  saveTarget: string
  saving: string
  habitsTitle: string
  habitTitleLabel: string
  habitTargetLabel: string
  habitUnitLabel: string
  habitUnitLabelHint: string
  unitCount: string
  unitMinutes: string
  unitLiters: string
  unitBoolean: string
  addHabit: string
  adding: string
  archive: string
  archiving: string
  emptyHabits: string
  success: string
  error: string
  close: string
}

type HabitUnit = "count" | "minutes" | "liters" | "boolean"

type HabitRow = {
  habitId: string
  title: string
  targetValue: number
  unit: string
  unitLabel: string | null
  currentValue: number
  done: boolean
}

type ClientPlanEditorProps = {
  clientId: string
  labels: ClientPlanEditorLabels
  initialCalories: number | null
  initialProtein: number | null
  initialCarbs: number | null
  initialFat: number | null
  habits: HabitRow[]
  open: boolean
  onClose: () => void
}

type PendingKind = "save" | "add" | "archive" | null

export const ClientPlanEditor = ({
  clientId,
  labels,
  initialCalories,
  initialProtein,
  initialCarbs,
  initialFat,
  habits: initialHabits,
  open,
  onClose,
}: ClientPlanEditorProps) => {
  const router = useRouter()
  const [calories, setCalories] = useState(String(initialCalories ?? ""))
  const [protein, setProtein] = useState(String(initialProtein ?? ""))
  const [carbs, setCarbs] = useState(String(initialCarbs ?? ""))
  const [fat, setFat] = useState(String(initialFat ?? ""))
  const [habitTitle, setHabitTitle] = useState("")
  const [habitTarget, setHabitTarget] = useState("1")
  const [habitUnit, setHabitUnit] = useState<HabitUnit>("count")
  const [habitUnitLabel, setHabitUnitLabel] = useState("")
  const [habits, setHabits] = useState(initialHabits)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingKind, setPendingKind] = useState<PendingKind>(null)
  const [isPending, startTransition] = useTransition()
  const wasOpen = useRef(false)

  // Reset form only when the modal opens (not on every refresh while open)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setCalories(String(initialCalories ?? ""))
      setProtein(String(initialProtein ?? ""))
      setCarbs(String(initialCarbs ?? ""))
      setFat(String(initialFat ?? ""))
      setHabits(initialHabits)
      setHabitTitle("")
      setHabitTarget("1")
      setHabitUnit("count")
      setHabitUnitLabel("")
      setMessage(null)
      setError(null)
      setPendingKind(null)
    }
    wasOpen.current = open
  }, [open, initialCalories, initialProtein, initialCarbs, initialFat, initialHabits])

  if (!open) return null

  const parseOptional = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }

  const handleSaveTarget = () => {
    setError(null)
    setMessage(null)
    setPendingKind("save")
    startTransition(async () => {
      const result = await upsertClientNutritionTarget({
        clientId,
        caloriesKcal: Number(calories),
        proteinG: parseOptional(protein),
        carbsG: parseOptional(carbs),
        fatG: parseOptional(fat),
      })
      setPendingKind(null)
      if (!result.success) {
        setError(labels.error)
        return
      }
      setMessage(labels.success)
      router.refresh()
    })
  }

  const handleAddHabit = () => {
    setError(null)
    setMessage(null)
    setPendingKind("add")
    startTransition(async () => {
      const label = habitUnitLabel.trim() || null
      const result = await createDailyHabit({
        clientId,
        title: habitTitle,
        targetValue: Number(habitTarget),
        unit: habitUnit,
        unitLabel: label,
      })
      setPendingKind(null)
      if (!result.success || !result.habitId) {
        setError(labels.error)
        return
      }
      setHabits((prev) => [
        ...prev,
        {
          habitId: result.habitId!,
          title: habitTitle.trim(),
          targetValue: Number(habitTarget),
          unit: habitUnit,
          unitLabel: label,
          currentValue: 0,
          done: false,
        },
      ])
      setHabitTitle("")
      setHabitTarget("1")
      setHabitUnit("count")
      setHabitUnitLabel("")
      setMessage(labels.success)
      router.refresh()
    })
  }

  const handleArchive = (habitId: string) => {
    setError(null)
    setPendingKind("archive")
    startTransition(async () => {
      const result = await archiveDailyHabit({ habitId, clientId })
      setPendingKind(null)
      if (!result.success) {
        setError(labels.error)
        return
      }
      setHabits((prev) => prev.filter((h) => h.habitId !== habitId))
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="plan-editor-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-300 bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="plan-editor-title"
            className="font-display text-lg font-bold text-ink-900"
          >
            {labels.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-2 text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            {labels.close}
          </button>
        </div>

        {error ? (
          <p className="mb-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-3 text-sm text-pine-dark" role="status">
            {message}
          </p>
        ) : null}

        <section className="mb-6">
          <h3 className="mb-3 font-display text-sm font-semibold text-ink-900">
            {labels.nutritionTitle}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1 text-xs font-semibold text-ink-500">
              {labels.caloriesLabel}
              <Input
                type="number"
                min={1}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="min-h-11"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
              {labels.proteinLabel}
              <Input
                type="number"
                min={0}
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="min-h-11"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
              {labels.carbsLabel}
              <Input
                type="number"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="min-h-11"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
              {labels.fatLabel}
              <Input
                type="number"
                min={0}
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="min-h-11"
              />
            </label>
          </div>
          <Button
            onClick={handleSaveTarget}
            disabled={isPending || !calories}
            className="mt-3 min-h-11"
          >
            {pendingKind === "save" ? labels.saving : labels.saveTarget}
          </Button>
        </section>

        <section>
          <h3 className="mb-3 font-display text-sm font-semibold text-ink-900">
            {labels.habitsTitle}
          </h3>
          {habits.length === 0 ? (
            <p className="mb-3 text-sm text-ink-500">{labels.emptyHabits}</p>
          ) : (
            <ul className="mb-4 flex flex-col gap-2">
              {habits.map((h) => (
                <li
                  key={h.habitId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2"
                >
                  <span className="text-sm text-ink-900">
                    {h.title}{" "}
                    <span className="text-ink-500">
                      ({h.targetValue.toLocaleString()}{" "}
                      {h.unitLabel?.trim() || h.unit})
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleArchive(h.habitId)}
                    className="min-h-9 text-xs font-semibold text-ink-500 hover:text-danger"
                  >
                    {pendingKind === "archive" ? labels.archiving : labels.archive}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2">
            <Input
              placeholder={labels.habitTitleLabel}
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              className="min-h-11"
              aria-label={labels.habitTitleLabel}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="number"
                min={1}
                placeholder={labels.habitTargetLabel}
                value={habitTarget}
                onChange={(e) => setHabitTarget(e.target.value)}
                className="min-h-11 sm:w-28"
                aria-label={labels.habitTargetLabel}
              />
              <label className="flex min-h-11 flex-1 flex-col justify-center gap-1 text-xs font-semibold text-ink-500">
                <span className="sr-only">{labels.habitUnitLabel}</span>
                <select
                  value={habitUnit}
                  onChange={(e) => setHabitUnit(e.target.value as HabitUnit)}
                  className="min-h-11 w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface px-3 text-sm font-medium text-ink-900"
                  aria-label={labels.habitUnitLabel}
                >
                  <option value="count">{labels.unitCount}</option>
                  <option value="minutes">{labels.unitMinutes}</option>
                  <option value="liters">{labels.unitLiters}</option>
                  <option value="boolean">{labels.unitBoolean}</option>
                </select>
              </label>
            </div>
            <Input
              placeholder={labels.habitUnitLabelHint}
              value={habitUnitLabel}
              onChange={(e) => setHabitUnitLabel(e.target.value)}
              className="min-h-11"
              aria-label={labels.habitUnitLabelHint}
            />
            <Button
              onClick={handleAddHabit}
              disabled={isPending || !habitTitle.trim()}
              className="min-h-11 w-fit"
            >
              {pendingKind === "add" ? labels.adding : labels.addHabit}
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
