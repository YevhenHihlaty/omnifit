"use client"

import { useTransition } from "react"
import { deleteWorkoutTemplate } from "@/features/log-training/actions"
import type { WorkoutTemplateListItem } from "@/features/log-training/types"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import { formatRelativeDay } from "@/features/coach-clients/format-relative"

export type WorkoutLibraryLabels = {
  title: string
  subtitle: string
  empty: string
  emptyHint: string
  exercises: string
  deleteLabel: string
  deleting: string
  loadFailed: string
  openClients: string
  createTemplate: string
  useTemplate: string
  lastUsed: string
  lastUsedNever: string
  relativeToday: string
  relativeYesterday: string
  relativeDaysAgo: string
}

type WorkoutLibraryViewProps = {
  templates: WorkoutTemplateListItem[]
  labels: WorkoutLibraryLabels
  loadFailed?: boolean
  sportLabels: Record<string, string>
}

const SPORT_TAG_COLORS: Record<string, string> = {
  weight_lifting: "bg-sky",
  general_fitness: "bg-sky",
  swimming: "bg-sky",
  running: "bg-peach",
  cycling: "bg-peach",
}

const sportTagColor = (sportType: string) =>
  SPORT_TAG_COLORS[sportType] ?? "bg-stone-150"

export const WorkoutLibraryView = ({
  templates,
  labels,
  loadFailed = false,
  sportLabels,
}: WorkoutLibraryViewProps) => {
  const [isPending, startTransition] = useTransition()
  const todayIso = new Date().toISOString().slice(0, 10)

  const handleDelete = (id: string) => {
    if (!window.confirm(labels.deleteLabel)) return
    startTransition(async () => {
      await deleteWorkoutTemplate(id)
    })
  }

  const formatLastUsed = (iso: string | null) => {
    if (!iso) return labels.lastUsedNever
    const when = formatRelativeDay(iso, todayIso, {
      today: labels.relativeToday,
      yesterday: labels.relativeYesterday,
      daysAgo: (n) => labels.relativeDaysAgo.replace("{days}", String(n)),
    })
    return labels.lastUsed.replace("{when}", when.toLowerCase())
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        <Link
          href={`${ROUTES.clients}?createTemplate=1`}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-pine px-5 text-sm font-semibold text-cream hover:bg-pine-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden><path d="M12 5v14M5 12h14"/></svg>
          {labels.createTemplate}
        </Link>
      </div>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {labels.loadFailed}
        </p>
      ) : null}

      {templates.length === 0 && !loadFailed ? (
        <div className="mt-8 rounded-[14px] border border-dashed border-stone-300 bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-ink-900">{labels.empty}</p>
          <p className="mt-2 text-sm text-ink-500">{labels.emptyHint}</p>
          <Link
            href={`${ROUTES.clients}?createTemplate=1`}
            className="mt-5 inline-flex min-h-11 items-center rounded-[10px] bg-pine px-5 text-sm font-semibold text-cream hover:bg-pine-dark"
          >
            {labels.openClients}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-2.5">
          {templates.map((tpl) => (
            <li
              key={tpl.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-stone-300 bg-surface px-4 py-3.5 hover:border-pine/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{tpl.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-ink-900 ${sportTagColor(tpl.sportType)}`}>
                    {sportLabels[tpl.sportType] ?? tpl.sportType}
                  </span>
                  <span className="text-[12.5px] text-ink-500">
                    {labels.exercises.replace("{n}", String(tpl.exerciseCount))}
                    {" · "}
                    {formatLastUsed(tpl.lastUsedAt)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`${ROUTES.clients}?template=${encodeURIComponent(tpl.id)}`}
                  className="inline-flex h-[34px] items-center rounded-[9px] border-[1.5px] border-stone-300 px-3 text-[13px] font-semibold text-ink-900 hover:border-pine"
                >
                  {labels.useTemplate}
                </Link>
                <button
                  type="button"
                  disabled={isPending}
                  aria-label={labels.deleteLabel}
                  onClick={() => handleDelete(tpl.id)}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border-[1.5px] border-stone-300 text-ink-700 hover:border-danger hover:text-danger disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
