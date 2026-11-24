"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button, EmptyState, StatusPill, Toggle } from "@omnifit/ui"
import { ClipboardList, Plus, Trash2 } from "lucide-react"
import {
  createServicePlan,
  deleteServicePlan,
  updateServicePlan,
} from "./actions"
import { formatPlanPrice, type ServicePlan } from "./types"

export type PlansLabels = {
  title: string
  subtitle: string
  newPlan: string
  emptyTitle: string
  emptyBody: string
  titleLabel: string
  durationLabel: string
  priceLabel: string
  descriptionLabel: string
  published: string
  draft: string
  save: string
  saving: string
  cancel: string
  edit: string
  delete: string
  minutes: string
  errors: Record<string, string>
}

type CoachPlansPanelProps = {
  plans: ServicePlan[]
  loadFailed: boolean
  loadFailedLabel: string
  labels: PlansLabels
}

export const CoachPlansPanel = ({
  plans,
  loadFailed,
  loadFailedLabel,
  labels,
}: CoachPlansPanelProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState("60")
  const [price, setPrice] = useState("50")
  const [description, setDescription] = useState("")
  const [published, setPublished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const resolveError = (code: string) =>
    labels.errors[code] ?? labels.errors.create_failed ?? code

  const openCreate = () => {
    setEditingId(null)
    setTitle("")
    setDuration("60")
    setPrice("50")
    setDescription("")
    setPublished(false)
    setError(null)
    setOpen(true)
  }

  const openEdit = (plan: ServicePlan) => {
    setEditingId(plan.id)
    setTitle(plan.title)
    setDuration(String(plan.durationMinutes))
    setPrice(String(plan.priceCents / 100))
    setDescription(plan.description ?? "")
    setPublished(plan.isPublished)
    setError(null)
    setOpen(true)
  }

  const handleSave = () => {
    setError(null)
    const durationMinutes = Number(duration)
    const priceCents = Math.round(Number(price) * 100)
    startTransition(async () => {
      const result = editingId
        ? await updateServicePlan({
            planId: editingId,
            title,
            durationMinutes,
            priceCents,
            description,
            isPublished: published,
          })
        : await createServicePlan({
            title,
            durationMinutes,
            priceCents,
            description,
            isPublished: published,
          })
      if (!result.success) {
        setError(resolveError(result.error))
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-900">
            {labels.title}
          </h2>
          <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {labels.newPlan}
        </Button>
      </div>

      {loadFailed ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {loadFailedLabel}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 rounded-[12px] border border-stone-300 bg-surface p-4">
          <label className="block text-sm font-medium" htmlFor="plan-title">
            {labels.titleLabel}
          </label>
          <input
            id="plan-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium" htmlFor="plan-duration">
                {labels.durationLabel}
              </label>
              <input
                id="plan-duration"
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="plan-price">
                {labels.priceLabel}
              </label>
              <input
                id="plan-price"
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1.5 w-full min-h-11 rounded-[10px] border-[1.5px] border-stone-300 px-3 text-sm focus:border-pine focus:outline-none"
              />
            </div>
          </div>
          <label className="mt-3 block text-sm font-medium" htmlFor="plan-desc">
            {labels.descriptionLabel}
          </label>
          <textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-[10px] border-[1.5px] border-stone-300 px-3 py-2 text-sm focus:border-pine focus:outline-none"
          />
          <div className="mt-3">
            <Toggle
              checked={published}
              onChange={setPublished}
              label={labels.published}
            />
          </div>
          {error ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={handleSave} disabled={pending || !title.trim()}>
              {pending ? labels.saving : labels.save}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {labels.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      {plans.length === 0 && !loadFailed && !open ? (
        <div className="mt-8">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" aria-hidden />}
            title={labels.emptyTitle}
            description={labels.emptyBody}
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-stone-300 bg-surface px-5 py-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{plan.title}</p>
                  <StatusPill
                    label={plan.isPublished ? labels.published : labels.draft}
                    variant={plan.isPublished ? "active" : "inactive"}
                  />
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {plan.durationMinutes} {labels.minutes} ·{" "}
                  {formatPlanPrice(plan.priceCents, plan.currency)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" onClick={() => openEdit(plan)}>
                  {labels.edit}
                </Button>
                <button
                  type="button"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-ink-500 hover:bg-stone-150 hover:text-danger"
                  aria-label={labels.delete}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteServicePlan(plan.id)
                      router.refresh()
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
