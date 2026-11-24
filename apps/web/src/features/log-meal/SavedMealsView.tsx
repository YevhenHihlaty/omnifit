"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import { logSavedMeal } from "./actions"
import type { SavedMealsLabels } from "./labels"
import type { SavedMealListItem } from "./types"

type SavedMealsViewProps = {
  labels: SavedMealsLabels
  meals: SavedMealListItem[]
  loadFailed?: boolean
}

export const SavedMealsView = ({
  labels,
  meals,
  loadFailed = false,
}: SavedMealsViewProps) => {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<"success" | "error">("success")
  const [isPending, startTransition] = useTransition()

  const handleLogAgain = (mealId: string) => {
    setStatus(null)
    startTransition(async () => {
      const result = await logSavedMeal(mealId)
      if (!result.success) {
        setStatusKind("error")
        setStatus(result.error)
        return
      }
      setStatusKind("success")
      setStatus(labels.loggedSuccess)
    })
  }

  return (
    <div className="mx-auto max-w-[1160px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold text-ink-900">
          {labels.title}
        </h1>
        <Link
          href={ROUTES.clientLogMeal}
          className="inline-flex h-10 items-center rounded-[10px] border-[1.5px] border-stone-300 px-4 text-[13.5px] font-semibold text-ink-900 hover:bg-stone-150"
        >
          {labels.backToLogMeal}
        </Link>
      </div>
      <p className="mb-7 text-sm text-ink-500">{labels.subtitle}</p>

      {loadFailed ? (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-medium text-danger">{labels.loadFailed}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-ink-900 px-4 text-sm font-semibold text-ink-900 hover:bg-stone-150"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      {status ? (
        <p
          className={
            statusKind === "error"
              ? "mb-4 text-sm font-medium text-danger"
              : "mb-4 text-sm font-medium text-pine-dark"
          }
          role={statusKind === "error" ? "alert" : "status"}
        >
          {status}
        </p>
      ) : null}

      {meals.length === 0 && !loadFailed ? (
        <section className="mt-10">
          <div className="flex max-w-md flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-stone-300 bg-surface px-9 py-9 text-center">
            <span
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-150"
              aria-hidden
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 2v7a2 2 0 0 0 4 0V2M9 11v11M17 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6v8"
                  stroke="#14181C"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className="font-display text-[15px] font-semibold text-ink-900">
              {labels.emptyTitle}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
              {labels.emptyBody}
            </p>
            <Link
              href={ROUTES.clientLogMeal}
              className="mt-5 inline-flex h-10 items-center rounded-[9px] border border-ink-900 px-4 text-sm font-semibold text-ink-900 hover:bg-stone-150"
            >
              {labels.goToLogMeal}
            </Link>
          </div>
        </section>
      ) : meals.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {meals.map((meal, index) => (
            <li
              key={meal.id}
              className="flex flex-col gap-3.5 rounded-[14px] border border-stone-300 bg-surface p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    index % 2 === 0 ? "bg-peach" : "bg-sage"
                  }`}
                  aria-hidden
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 2v7a2 2 0 0 0 4 0V2M9 11v11M17 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6v8"
                      stroke="#14181C"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-ink-900">
                    {meal.name}
                  </p>
                  <p className="text-[12.5px] text-ink-500">
                    {meal.lastUsedAt
                      ? labels.lastUsed.replace(
                          "{date}",
                          new Date(meal.lastUsedAt).toLocaleDateString()
                        )
                      : labels.neverUsed}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-butter px-2 py-0.5 text-[11px] font-semibold">
                  {meal.macros.caloriesKcal} kcal
                </span>
                <span className="rounded-full bg-pine-tint px-2 py-0.5 text-[11px] font-semibold text-pine-dark">
                  {meal.macros.proteinG}g P
                </span>
                <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold">
                  {meal.macros.carbsG}g C
                </span>
                <span className="rounded-full bg-peach px-2 py-0.5 text-[11px] font-semibold">
                  {meal.macros.fatG}g F
                </span>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleLogAgain(meal.id)}
                className="inline-flex h-[38px] w-fit items-center gap-1.5 rounded-[9px] bg-pine px-4 text-[13px] font-semibold text-surface hover:bg-pine-dark disabled:opacity-60"
              >
                + {labels.logAgain}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
