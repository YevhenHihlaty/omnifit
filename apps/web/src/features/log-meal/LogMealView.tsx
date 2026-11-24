"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import {
  createMealWithItems,
  incrementUsage,
  saveAsMeal,
  searchProductsAction,
} from "./actions"
import { AddProductForm } from "./AddProductForm"
import { FOOD_SEARCH_MIN_QUERY_LENGTH } from "./constants"
import {
  formatDraftQuantityGrams,
  PRODUCT_DETAIL_QUANTITY_STEP,
} from "./product-quantity"
import {
  formatServingLabel,
  prependFoodProductsToRecents,
  scaleProductMacros,
  sumMealDraftTotals,
} from "./macros"
import { ProductDetailPanel } from "./ProductDetailPanel"
import { useFoodProductSearch } from "./useFoodProductSearch"
import type { LogMealLabels } from "./labels"
import type {
  FoodProductListItem,
  LogMealPageData,
  MacroTotals,
  MealDraftItem,
  MealType,
} from "./types"
import { MEAL_TYPES } from "./types"

type LogMealViewProps = {
  initialData: LogMealPageData
  labels: LogMealLabels
  loadFailed?: boolean
}

export const LogMealView = ({
  initialData,
  labels,
  loadFailed = false,
}: LogMealViewProps) => {
  const [mealType, setMealType] = useState<MealType>(initialData.defaultMealType)
  const [searchQuery, setSearchQuery] = useState("")
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("")
  const [draftItems, setDraftItems] = useState<MealDraftItem[]>([])
  const [recents, setRecents] = useState(initialData.recents)
  const [todayTotals, setTodayTotals] = useState(initialData.todayTotals)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [saveAsName, setSaveAsName] = useState("")
  const [selectedProduct, setSelectedProduct] =
    useState<FoodProductListItem | null>(null)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<"success" | "error">("success")
  const [isSaving, startSave] = useTransition()
  const [isSavingAs, startSaveAs] = useTransition()

  const {
    results: searchResults,
    isSearching,
    isActiveSearch,
    searchFailed,
  } = useFoodProductSearch(submittedSearchQuery, searchProductsAction)

  const draftTotals = sumMealDraftTotals(draftItems)
  const sidebarTotals = addMacros(todayTotals, draftTotals)
  const progress =
    initialData.targetKcal && initialData.targetKcal > 0
      ? Math.min(1, sidebarTotals.caloriesKcal / initialData.targetKcal)
      : 0

  const handleSearchSubmit = (rawQuery?: string) => {
    setSubmittedSearchQuery((rawQuery ?? searchQuery).trim())
  }

  const handleAddToMeal = (
    product: FoodProductListItem,
    quantityServings: number
  ) => {
    setDraftItems((items) => {
      const existing = items.find((item) => item.product.id === product.id)
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantityServings: item.quantityServings + quantityServings,
              }
            : item
        )
      }
      return [...items, { product, quantityServings }]
    })
    void incrementUsage(product.id)
    setSelectedProduct(null)
    setStatusMessage(null)
    setJustAddedId(product.id)
    window.setTimeout(() => {
      setJustAddedId((current) => (current === product.id ? null : current))
    }, 1200)
  }

  const handleSelectProduct = (product: FoodProductListItem) => {
    setSelectedProduct(product)
  }

  const handleQuantityChange = (productId: string, delta: number) => {
    setDraftItems((items) =>
      items
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantityServings: Math.max(0, item.quantityServings + delta),
              }
            : item
        )
        .filter((item) => item.quantityServings > 0)
    )
  }

  const handleRemoveDraftItem = (productId: string) => {
    setDraftItems((items) => items.filter((item) => item.product.id !== productId))
  }

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value)
    if (value.trim().length < FOOD_SEARCH_MIN_QUERY_LENGTH) {
      setSubmittedSearchQuery("")
    }
  }

  const handleManualProductCreated = (product: FoodProductListItem) => {
    setRecents((current) => prependFoodProductsToRecents(current, [product]))
    setShowAddProduct(false)
    setSelectedProduct(product)
  }

  const handleSaveMeal = () => {
    startSave(async () => {
      const result = await createMealWithItems({
        mealType,
        items: draftItems.map((item) => ({
          productId: item.product.id,
          quantityServings: item.quantityServings,
        })),
      })
      if (!result.success) {
        setStatusKind("error")
        setStatusMessage(result.error)
        return
      }
      setTodayTotals((prev) => addMacros(prev, draftTotals))
      setDraftItems([])
      setStatusKind("success")
      setStatusMessage(labels.savedMeal)
    })
  }

  const handleSaveAsMeal = () => {
    startSaveAs(async () => {
      const result = await saveAsMeal({
        name: saveAsName,
        mealType,
        items: draftItems.map((item) => ({
          productId: item.product.id,
          quantityServings: item.quantityServings,
        })),
      })
      if (!result.success) {
        setStatusKind("error")
        setStatusMessage(result.error)
        return
      }
      setShowSaveAs(false)
      setSaveAsName("")
      setStatusKind("success")
      setStatusMessage(labels.savedAsMeal)
    })
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold text-ink-900">
          {labels.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={ROUTES.clientLogMealSaved}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-stone-300 px-4 text-sm font-semibold text-ink-900 hover:bg-stone-150"
          >
            {labels.savedMealsLink}
          </Link>
          <button
            type="button"
            onClick={() => setShowAddProduct(true)}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-pine px-4 text-sm font-semibold text-pine hover:bg-pine-tint"
          >
            {labels.addProduct}
          </button>
        </div>
      </div>

      {loadFailed ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-medium text-danger">{labels.loadFailed}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-ink-900 px-4 text-sm font-semibold text-ink-900 hover:bg-stone-150"
          >
            {labels.retry}
          </button>
        </div>
      ) : null}

      <div
        className="inline-flex w-fit gap-1 rounded-[10px] bg-stone-150 p-1"
        role="tablist"
        aria-label={labels.mealTypeTabsAria}
      >
        {MEAL_TYPES.map((type) => {
          const active = type === mealType
          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMealType(type)}
              className={[
                "rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-surface text-ink-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-700",
              ].join(" ")}
            >
              {labels.mealTypes[type]}
            </button>
          )
        })}
      </div>

      <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="food-search"
              className="mb-2 block text-[13px] font-semibold text-ink-700"
            >
              {labels.searchLabel}
            </label>
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault()
                const input = event.currentTarget.elements.namedItem(
                  "food-search"
                ) as HTMLInputElement | null
                handleSearchSubmit(input?.value ?? searchQuery)
              }}
            >
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-500"
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="food-search"
                name="food-search"
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-[46px] w-full rounded-[10px] border-[1.5px] border-stone-300 bg-surface py-0 pl-10 pr-4 text-[15px] text-ink-900 outline-none transition-[border-color,box-shadow] focus:border-pine focus:shadow-[0_0_0_3px_var(--of-pine-tint)]"
              />
            </form>
          </div>

          {isActiveSearch ? (
            <section>
              <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-ink-500">
                {labels.searchResultsTitle}
              </p>
              {isSearching ? (
                <p className="text-sm text-ink-500">{labels.searching}</p>
              ) : null}
              {searchFailed ? (
                <p className="text-sm text-danger" role="alert">
                  {labels.searchFailed}
                </p>
              ) : null}
              {!isSearching && !searchFailed && searchResults.length === 0 ? (
                <p className="text-sm text-ink-500">{labels.searchEmpty}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {searchResults.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    justAdded={justAddedId === product.id}
                    onOpen={() => handleSelectProduct(product)}
                    onInstantAdd={() => handleAddToMeal(product, 1)}
                    addLabel={`${labels.productDetail.addToMeal} ${product.name}`}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-ink-500">
              {labels.recentTitle}
            </p>
            {recents.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.recentEmpty}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {recents.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-300 bg-surface px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40"
                    >
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {product.name}
                      </p>
                      <p className="text-[12.5px] text-ink-500">
                        {formatServingLabel(product.servingSizeG)}
                        {product.caloriesKcal != null
                          ? ` · ${Math.round(product.caloriesKcal)} kcal`
                          : ""}
                      </p>
                    </button>
                    <AddButton
                      ariaLabel={`${labels.productDetail.addToMeal} ${product.name}`}
                      justAdded={justAddedId === product.id}
                      onClick={() => handleAddToMeal(product, 1)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-ink-500">
              {labels.draftTitle}
            </p>
            {draftItems.length === 0 ? (
              <p className="text-sm text-ink-500">{labels.emptyDraft}</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {draftItems.map((item) => {
                  const macros = scaleProductMacros(
                    item.product,
                    item.quantityServings
                  )
                  return (
                    <li
                      key={item.product.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-300 bg-surface px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">
                          {item.product.name}
                        </p>
                        <p className="text-[12.5px] text-ink-500">
                          {formatDraftQuantityGrams(
                            item.quantityServings,
                            item.product.servingSizeG
                          )}{" "}
                          · {Math.round(macros.caloriesKcal)} kcal
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={labels.decreaseQuantity}
                          onClick={() =>
                            handleQuantityChange(
                              item.product.id,
                              -PRODUCT_DETAIL_QUANTITY_STEP
                            )
                          }
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          aria-label={labels.increaseQuantity}
                          onClick={() =>
                            handleQuantityChange(
                              item.product.id,
                              PRODUCT_DETAIL_QUANTITY_STEP
                            )
                          }
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.product.id)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-semibold text-danger"
                        >
                          {labels.removeItem}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {statusMessage ? (
            <p
              className={
                statusKind === "error"
                  ? "text-sm font-medium text-danger"
                  : "text-sm font-medium text-pine-dark"
              }
              role={statusKind === "error" ? "alert" : "status"}
            >
              {statusMessage}
            </p>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-stone-300 bg-surface p-[22px] lg:sticky lg:top-0">
          <h2 className="font-display text-base font-semibold text-ink-900">
            {labels.todayTitle}
          </h2>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-[30px] font-bold tabular-nums text-ink-900">
              {Math.round(sidebarTotals.caloriesKcal)}
            </span>
            <span className="text-[13px] text-ink-500">
              {initialData.targetKcal != null
                ? `/ ${initialData.targetKcal} ${labels.kcalUnit}`
                : labels.kcalUnit}
            </span>
          </div>
          {initialData.targetKcal != null ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-150">
              <div
                className="h-full rounded-full bg-pine transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          ) : null}
          <ul className="mt-5 flex flex-col gap-3">
            <MacroRow
              label={labels.protein}
              value={sidebarTotals.proteinG}
              target={initialData.targetProteinG}
              dot="bg-pine"
            />
            <MacroRow
              label={labels.carbs}
              value={sidebarTotals.carbsG}
              target={initialData.targetCarbsG}
              dot="bg-sky"
            />
            <MacroRow
              label={labels.fat}
              value={sidebarTotals.fatG}
              target={initialData.targetFatG}
              dot="bg-peach"
            />
          </ul>
          <button
            type="button"
            disabled={draftItems.length === 0 || isSaving}
            onClick={handleSaveMeal}
            className="mt-6 flex h-[46px] w-full items-center justify-center rounded-[10px] bg-pine text-[15px] font-semibold text-surface hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? labels.savingMeal : labels.saveMeal}
          </button>
          <button
            type="button"
            disabled={draftItems.length === 0}
            onClick={() => setShowSaveAs(true)}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-[10px] border border-stone-300 text-sm font-semibold text-ink-900 hover:bg-stone-150 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.saveAsMeal}
          </button>
        </aside>
      </div>

      {selectedProduct ? (
        <ProductDetailPanel
          product={selectedProduct}
          labels={labels.productDetail}
          mealType={mealType}
          mealTypeLabels={labels.mealTypes}
          mealTypeTabsAria={labels.mealTypeTabsAria}
          onMealTypeChange={setMealType}
          onClose={() => setSelectedProduct(null)}
          onAddToMeal={(qty) => handleAddToMeal(selectedProduct, qty)}
        />
      ) : null}

      {showAddProduct ? (
        <AddProductForm
          labels={labels.addProductForm}
          onClose={() => setShowAddProduct(false)}
          onCreated={handleManualProductCreated}
        />
      ) : null}

      {showSaveAs ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-as-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={labels.saveAsMealDialog.close}
            onClick={() => setShowSaveAs(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-300 bg-surface p-6 shadow-lg">
            <h2
              id="save-as-title"
              className="font-display text-lg font-semibold text-ink-900"
            >
              {labels.saveAsMealDialog.title}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {labels.saveAsMealDialog.subtitle}
            </p>
            <label className="mt-4 block text-sm font-semibold text-ink-700">
              {labels.saveAsMealDialog.nameLabel}
              <input
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder={labels.saveAsMealDialog.namePlaceholder}
                className="mt-1.5 h-11 w-full rounded-[10px] border border-stone-300 px-3 text-sm outline-none focus:border-pine focus:shadow-[0_0_0_3px_var(--of-pine-tint)]"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveAs(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-ink-900 text-sm font-semibold text-ink-900 hover:bg-stone-150"
              >
                {labels.saveAsMealDialog.cancel}
              </button>
              <button
                type="button"
                disabled={!saveAsName.trim() || isSavingAs}
                onClick={handleSaveAsMeal}
                className="flex h-11 flex-1 items-center justify-center rounded-[10px] bg-pine text-sm font-semibold text-surface disabled:opacity-50"
              >
                {isSavingAs
                  ? labels.saveAsMealDialog.saving
                  : labels.saveAsMealDialog.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const addMacros = (a: MacroTotals, b: MacroTotals): MacroTotals => ({
  caloriesKcal: a.caloriesKcal + b.caloriesKcal,
  proteinG: Math.round((a.proteinG + b.proteinG) * 10) / 10,
  carbsG: Math.round((a.carbsG + b.carbsG) * 10) / 10,
  fatG: Math.round((a.fatG + b.fatG) * 10) / 10,
})

const MacroRow = ({
  label,
  value,
  target,
  dot,
}: {
  label: string
  value: number
  target?: number | null
  dot: string
}) => (
  <li className="flex items-center justify-between text-[13.5px]">
    <span className="flex items-center gap-2 text-ink-700">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
    <span className="font-semibold tabular-nums text-ink-900">
      {target != null
        ? `${Math.round(value)}g / ${Math.round(target)}g`
        : `${Math.round(value)}g`}
    </span>
  </li>
)

const AddButton = ({
  onClick,
  ariaLabel,
  justAdded = false,
}: {
  onClick: () => void
  ariaLabel: string
  justAdded?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={[
      "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] text-base font-semibold transition-colors",
      justAdded
        ? "border-pine bg-pine text-surface"
        : "border-pine text-pine",
    ].join(" ")}
  >
    {justAdded ? "✓" : "+"}
  </button>
)

const ProductCard = ({
  product,
  onOpen,
  onInstantAdd,
  addLabel,
  justAdded,
}: {
  product: FoodProductListItem
  onOpen: () => void
  onInstantAdd: () => void
  addLabel: string
  justAdded: boolean
}) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-300 bg-surface px-4 py-3.5">
    <button
      type="button"
      onClick={onOpen}
      className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine/40"
    >
      <p className="truncate text-sm font-semibold text-ink-900">{product.name}</p>
      <p className="mt-0.5 text-[12.5px] text-ink-500">
        {product.brand ? `${product.brand} · ` : ""}
        {formatServingLabel(product.servingSizeG)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-butter px-2 py-0.5 text-[11px] font-semibold">
          {Math.round(product.caloriesKcal ?? 0)} kcal
        </span>
        <span className="rounded-full bg-pine-tint px-2 py-0.5 text-[11px] font-semibold text-pine-dark">
          {Math.round(product.proteinG ?? 0)}g P
        </span>
        <span className="rounded-full bg-sky px-2 py-0.5 text-[11px] font-semibold">
          {Math.round(product.carbsG ?? 0)}g C
        </span>
        <span className="rounded-full bg-peach px-2 py-0.5 text-[11px] font-semibold">
          {Math.round(product.fatG ?? 0)}g F
        </span>
      </div>
    </button>
    <AddButton
      onClick={onInstantAdd}
      ariaLabel={addLabel}
      justAdded={justAdded}
    />
  </div>
)
