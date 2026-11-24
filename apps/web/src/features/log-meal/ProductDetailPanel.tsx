"use client"

import { useEffect, useState } from "react"
import {
  clampProductGrams,
  decrementProductGrams,
  formatGramsDisplay,
  getDefaultProductGrams,
  gramsToQuantityServings,
  incrementProductGrams,
  parseGramsInput,
} from "./product-quantity"
import { formatServingLabel, scaleProductMacros } from "./macros"
import type { ProductDetailLabels } from "./labels"
import type { FoodProductListItem, MealType } from "./types"
import { MEAL_TYPES } from "./types"

type ProductDetailPanelProps = {
  product: FoodProductListItem
  labels: ProductDetailLabels
  mealType: MealType
  mealTypeLabels: Record<MealType, string>
  mealTypeTabsAria: string
  onMealTypeChange: (type: MealType) => void
  onClose: () => void
  onAddToMeal: (quantityServings: number) => void
}

export const ProductDetailPanel = ({
  product,
  labels,
  mealType,
  mealTypeLabels,
  mealTypeTabsAria,
  onMealTypeChange,
  onClose,
  onAddToMeal,
}: ProductDetailPanelProps) => {
  const [grams, setGrams] = useState(() =>
    getDefaultProductGrams(product.servingSizeG)
  )
  const [gramsInput, setGramsInput] = useState(() =>
    formatGramsDisplay(getDefaultProductGrams(product.servingSizeG))
  )

  const quantityServings = gramsToQuantityServings(grams, product.servingSizeG)
  const macros = scaleProductMacros(product, quantityServings)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const syncGrams = (nextGrams: number) => {
    const clamped = clampProductGrams(nextGrams, product.servingSizeG)
    setGrams(clamped)
    setGramsInput(formatGramsDisplay(clamped))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={labels.close}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="product-detail-title"
              className="font-display text-lg font-semibold text-ink-900"
            >
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {product.brand ? `${product.brand} · ` : ""}
              {formatServingLabel(product.servingSizeG)}
            </p>
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

        <div
          className="mt-4 inline-flex w-full gap-1 rounded-[10px] bg-stone-150 p-1"
          role="tablist"
          aria-label={mealTypeTabsAria}
        >
          {MEAL_TYPES.map((type) => {
            const active = type === mealType
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onMealTypeChange(type)}
                className={[
                  "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-surface text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-700",
                ].join(" ")}
              >
                {mealTypeLabels[type]}
              </button>
            )
          })}
        </div>

        <label className="mt-5 block text-sm font-semibold text-ink-700">
          {labels.amountGrams}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                syncGrams(decrementProductGrams(grams, product.servingSizeG))
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-lg font-semibold"
              aria-label={labels.decreaseGrams}
            >
              −
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={gramsInput}
              onChange={(e) => {
                setGramsInput(e.target.value)
                const parsed = parseGramsInput(e.target.value)
                if (parsed === null) return
                setGrams(clampProductGrams(parsed, product.servingSizeG))
              }}
              onBlur={() => setGramsInput(formatGramsDisplay(grams))}
              className="h-11 flex-1 rounded-[10px] border border-stone-300 px-3 text-center font-display text-lg font-semibold tabular-nums outline-none focus:border-pine focus:shadow-[0_0_0_3px_var(--of-pine-tint)]"
              aria-label={labels.amountGrams}
            />
            <span className="text-sm text-ink-500">{labels.gramsUnit}</span>
            <button
              type="button"
              onClick={() =>
                syncGrams(incrementProductGrams(grams, product.servingSizeG))
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-lg font-semibold"
              aria-label={labels.increaseGrams}
            >
              +
            </button>
          </div>
        </label>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-butter px-3 py-2">
            <dt className="text-ink-500">{labels.calories}</dt>
            <dd className="font-display font-semibold tabular-nums">
              {Math.round(macros.caloriesKcal)}
            </dd>
          </div>
          <div className="rounded-xl bg-pine-tint px-3 py-2">
            <dt className="text-ink-500">{labels.protein}</dt>
            <dd className="font-display font-semibold tabular-nums">
              {macros.proteinG}g
            </dd>
          </div>
          <div className="rounded-xl bg-sky px-3 py-2">
            <dt className="text-ink-500">{labels.carbs}</dt>
            <dd className="font-display font-semibold tabular-nums">
              {macros.carbsG}g
            </dd>
          </div>
          <div className="rounded-xl bg-peach px-3 py-2">
            <dt className="text-ink-500">{labels.fat}</dt>
            <dd className="font-display font-semibold tabular-nums">
              {macros.fatG}g
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => {
            const clamped = clampProductGrams(grams, product.servingSizeG)
            onAddToMeal(gramsToQuantityServings(clamped, product.servingSizeG))
          }}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] bg-ink-900 text-[15px] font-semibold text-surface hover:bg-ink-700"
        >
          {labels.addToMeal}
        </button>
      </div>
    </div>
  )
}
