"use client"

import { useEffect, useState, useTransition } from "react"
import { createManualProduct } from "./actions"
import type { AddProductFormLabels } from "./labels"
import type { FoodProductListItem } from "./types"

type AddProductFormProps = {
  labels: AddProductFormLabels
  onClose: () => void
  onCreated: (product: FoodProductListItem) => void
}

export const AddProductForm = ({
  labels,
  onClose,
  onCreated,
}: AddProductFormProps) => {
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [serving, setServing] = useState("100")
  const [kcal, setKcal] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createManualProduct({
        name,
        brand: brand.trim() || undefined,
        serving_size_g: Number(serving),
        calories_kcal: Number(kcal),
        protein_g: protein === "" ? undefined : Number(protein),
        carbs_g: carbs === "" ? undefined : Number(carbs),
        fat_g: fat === "" ? undefined : Number(fat),
      })
      if (!result.success || !result.product) {
        setError(result.success === false ? result.error : "Failed")
        return
      }
      onCreated(result.product)
    })
  }

  const fieldClass =
    "mt-1.5 h-11 w-full rounded-[10px] border border-stone-300 bg-surface px-3 text-sm text-ink-900 outline-none focus:border-pine focus:shadow-[0_0_0_3px_var(--of-pine-tint)] focus:outline-none"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={labels.close}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="add-product-title"
              className="font-display text-lg font-semibold text-ink-900"
            >
              {labels.title}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-500 hover:bg-stone-150"
            aria-label={labels.close}
          >
            ×
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-ink-700">
          {labels.nameLabel}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-ink-700">
          {labels.brandLabel}
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={fieldClass}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-ink-700">
            {labels.servingSizeLabel}
            <div className="relative">
              <input
                required
                type="number"
                min={0.1}
                step="any"
                value={serving}
                onChange={(e) => setServing(e.target.value)}
                className={`${fieldClass} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[12.5px] text-ink-500">{labels.unitG}</span>
            </div>
          </label>
          <label className="block text-sm font-semibold text-ink-700">
            {labels.caloriesLabel}
            <div className="relative">
              <input
                required
                type="number"
                min={0}
                step="any"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                className={`${fieldClass} pr-10`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[12.5px] text-ink-500">{labels.caloriesUnit}</span>
            </div>
          </label>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <label className="block text-sm font-semibold text-ink-700">
            {labels.proteinLabel}
            <div className="relative">
              <input
                type="number"
                min={0}
                step="any"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className={`${fieldClass} pr-6`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[12px] text-ink-500">{labels.unitG}</span>
            </div>
          </label>
          <label className="block text-sm font-semibold text-ink-700">
            {labels.carbsLabel}
            <div className="relative">
              <input
                type="number"
                min={0}
                step="any"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className={`${fieldClass} pr-6`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[12px] text-ink-500">{labels.unitG}</span>
            </div>
          </label>
          <label className="block text-sm font-semibold text-ink-700">
            {labels.fatLabel}
            <div className="relative">
              <input
                type="number"
                min={0}
                step="any"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className={`${fieldClass} pr-6`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-[12px] text-ink-500">{labels.unitG}</span>
            </div>
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-stone-300 text-[15px] font-semibold text-ink-900 hover:border-ink-900 hover:bg-stone-150"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-pine text-[15px] font-semibold text-surface hover:bg-pine-dark disabled:opacity-60"
          >
            {labels.save}
          </button>
        </div>
      </form>
    </div>
  )
}
