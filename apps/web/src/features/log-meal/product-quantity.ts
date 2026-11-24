export const PRODUCT_DETAIL_QUANTITY_STEP = 0.5

export const PRODUCT_DETAIL_MIN_QUANTITY = PRODUCT_DETAIL_QUANTITY_STEP

/** Default quantity when opening product detail (full serving). */
export const PRODUCT_DETAIL_DEFAULT_QUANTITY = 1

/** Fallback when a product has no serving_size_g — keeps grams math defined. */
export const PRODUCT_DETAIL_FALLBACK_SERVING_G = 100

export const incrementProductQuantity = (quantity: number): number =>
  roundQuantity(quantity + PRODUCT_DETAIL_QUANTITY_STEP)

export const decrementProductQuantity = (quantity: number): number => {
  const next = roundQuantity(quantity - PRODUCT_DETAIL_QUANTITY_STEP)
  return next < PRODUCT_DETAIL_MIN_QUANTITY
    ? PRODUCT_DETAIL_MIN_QUANTITY
    : next
}

export const roundQuantity = (quantity: number): number =>
  Math.round(quantity * 2) / 2

export const formatQuantityDisplay = (quantity: number): string => {
  const rounded = roundQuantity(quantity)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export const resolveServingGrams = (servingSizeG: number | null): number =>
  servingSizeG && servingSizeG > 0
    ? servingSizeG
    : PRODUCT_DETAIL_FALLBACK_SERVING_G

export const roundGrams = (grams: number): number =>
  Math.round(grams * 10) / 10

export const getDefaultProductGrams = (servingSizeG: number | null): number =>
  roundGrams(
    resolveServingGrams(servingSizeG) * PRODUCT_DETAIL_DEFAULT_QUANTITY
  )

export const getProductGramStep = (servingSizeG: number | null): number =>
  roundGrams(resolveServingGrams(servingSizeG) * PRODUCT_DETAIL_QUANTITY_STEP)

export const getMinProductGrams = (servingSizeG: number | null): number =>
  getProductGramStep(servingSizeG)

export const gramsToQuantityServings = (
  grams: number,
  servingSizeG: number | null
): number => {
  const servingG = resolveServingGrams(servingSizeG)
  if (!Number.isFinite(grams) || grams <= 0 || servingG <= 0) return 0
  return grams / servingG
}

export const quantityServingsToGrams = (
  quantityServings: number,
  servingSizeG: number | null
): number =>
  roundGrams(resolveServingGrams(servingSizeG) * quantityServings)

export const incrementProductGrams = (
  grams: number,
  servingSizeG: number | null
): number => roundGrams(grams + getProductGramStep(servingSizeG))

export const decrementProductGrams = (
  grams: number,
  servingSizeG: number | null
): number => {
  const next = roundGrams(grams - getProductGramStep(servingSizeG))
  const min = getMinProductGrams(servingSizeG)
  return next < min ? min : next
}

export const clampProductGrams = (
  grams: number,
  servingSizeG: number | null
): number => {
  if (!Number.isFinite(grams)) return getMinProductGrams(servingSizeG)
  const min = getMinProductGrams(servingSizeG)
  return roundGrams(Math.max(min, grams))
}

export const formatGramsDisplay = (grams: number): string => {
  const rounded = roundGrams(grams)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export const formatDraftQuantityGrams = (
  quantityServings: number,
  servingSizeG: number | null
): string =>
  `${formatGramsDisplay(quantityServingsToGrams(quantityServings, servingSizeG))}g`

export const parseGramsInput = (value: string): number | null => {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
