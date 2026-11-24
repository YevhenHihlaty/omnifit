import { FOOD_SEARCH_MIN_QUERY_LENGTH, FOOD_SEARCH_RESULTS_LIMIT } from "./constants"
import type { FoodProductListItem } from "./types"

/** Trim and strip ilike wildcards from user input. */
export const normalizeFoodSearchTerm = (query: string): string =>
  query.trim().replace(/[%_]/g, "")

export const isFoodSearchQueryValid = (query: string): boolean =>
  normalizeFoodSearchTerm(query).length >= FOOD_SEARCH_MIN_QUERY_LENGTH

/** Lowercase tokens for client-side refinement (case-insensitive). */
export const tokenizeFoodSearchQuery = (query: string): string[] =>
  normalizeFoodSearchTerm(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)

export const productMatchesAllSearchWords = (
  product: FoodProductListItem,
  words: string[]
): boolean => {
  const haystack = `${product.name} ${product.brand ?? ""}`.toLowerCase()
  return words.every((word) => haystack.includes(word))
}

export const filterFoodProductsByWords = (
  products: FoodProductListItem[],
  words: string[]
): FoodProductListItem[] => {
  if (words.length === 0) return []
  return products.filter((product) => productMatchesAllSearchWords(product, words))
}

export const sortFoodProductsByPopularity = (
  products: FoodProductListItem[]
): FoodProductListItem[] =>
  [...products].toSorted((left, right) => {
    const usageDiff = right.usageCount - left.usageCount
    if (usageDiff !== 0) return usageDiff
    return left.name.localeCompare(right.name)
  })

export const takeTopFoodSearchResults = (
  products: FoodProductListItem[],
  limit = FOOD_SEARCH_RESULTS_LIMIT
): FoodProductListItem[] => sortFoodProductsByPopularity(products).slice(0, limit)

export type FoodSearchCacheState = {
  anchor: string | null
  pool: FoodProductListItem[]
}

export type FoodSearchPlan =
  | { kind: "clear" }
  | { kind: "rpc"; term: string }
  | { kind: "filter"; words: string[] }

/**
 * Decide whether to hit Supabase or refine the cached pool.
 * - Single word: always RPC that word (fresh catalog search).
 * - Multi-word starting with the current anchor: filter the cached pool.
 * - Otherwise: RPC the first word (new anchor).
 */
export const planFoodProductSearch = (
  submittedQuery: string,
  cache: FoodSearchCacheState
): FoodSearchPlan => {
  const words = tokenizeFoodSearchQuery(submittedQuery)
  if (words.length === 0 || !isFoodSearchQueryValid(submittedQuery)) {
    return { kind: "clear" }
  }

  if (words.length === 1) {
    return { kind: "rpc", term: words[0]! }
  }

  const anchor = cache.anchor

  if (anchor && words[0] === anchor && cache.pool.length > 0) {
    return { kind: "filter", words }
  }

  return { kind: "rpc", term: words[0]! }
}

/** Build `%term%` pattern, or null when the query is too short. */
export const buildFoodSearchIlikePattern = (query: string): string | null => {
  const term = normalizeFoodSearchTerm(query)
  if (term.length < FOOD_SEARCH_MIN_QUERY_LENGTH) return null
  return `%${term}%`
}

/** Quote a PostgREST filter value so commas and spaces stay inside the operand. */
export const quotePostgrestFilterValue = (value: string): string =>
  `"${value.replace(/"/g, '""')}"`

export const buildFoodProductSearchOrFilter = (ilikePattern: string): string => {
  const quoted = quotePostgrestFilterValue(ilikePattern)
  return `name.ilike.${quoted},brand.ilike.${quoted}`
}
