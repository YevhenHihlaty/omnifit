import { describe, expect, it } from "vitest"
import {
  buildFoodProductSearchOrFilter,
  buildFoodSearchIlikePattern,
  filterFoodProductsByWords,
  isFoodSearchQueryValid,
  normalizeFoodSearchTerm,
  planFoodProductSearch,
  productMatchesAllSearchWords,
  quotePostgrestFilterValue,
  sortFoodProductsByPopularity,
  takeTopFoodSearchResults,
  tokenizeFoodSearchQuery,
} from "./search"
import type { FoodProductListItem } from "./types"

const product = (
  overrides: Partial<FoodProductListItem> & Pick<FoodProductListItem, "id" | "name">
): FoodProductListItem => ({
  id: overrides.id,
  name: overrides.name,
  brand: overrides.brand ?? null,
  servingSizeG: 100,
  caloriesKcal: 100,
  proteinG: 5,
  carbsG: 10,
  fatG: 2,
  source: "off",
  createdBy: null,
  usageCount: overrides.usageCount ?? 0,
})

describe("food product search helpers", () => {
  it("normalizes whitespace and strips ilike wildcards", () => {
    expect(normalizeFoodSearchTerm("  o%at_s  ")).toBe("oats")
  })

  it("rejects queries shorter than two characters", () => {
    expect(isFoodSearchQueryValid("a")).toBe(false)
    expect(buildFoodSearchIlikePattern("a")).toBeNull()
  })

  it("builds ilike patterns for valid queries", () => {
    expect(buildFoodSearchIlikePattern("greek")).toBe("%greek%")
  })

  it("quotes postgrest values with commas and quotes", () => {
    expect(quotePostgrestFilterValue('%milk, oat%')).toBe('"%milk, oat%"')
    expect(quotePostgrestFilterValue('say "hi"')).toBe('"say ""hi"""')
  })

  it("builds a name/brand or filter with quoted operands", () => {
    expect(buildFoodProductSearchOrFilter("%oats%")).toBe(
      'name.ilike."%oats%",brand.ilike."%oats%"'
    )
  })

  it("tokenizes queries case-insensitively", () => {
    expect(tokenizeFoodSearchQuery("  Barilla  Spaghetti ")).toEqual([
      "barilla",
      "spaghetti",
    ])
  })

  it("matches products when every word appears in name or brand", () => {
    const spaghetti = product({
      id: "1",
      name: "Spaghetti",
      brand: "Barilla",
    })
    expect(productMatchesAllSearchWords(spaghetti, ["spaghetti", "barilla"])).toBe(
      true
    )
    expect(productMatchesAllSearchWords(spaghetti, ["spaghetti", "dececco"])).toBe(
      false
    )
  })

  it("sorts by usage count then name", () => {
    const ranked = sortFoodProductsByPopularity([
      product({ id: "a", name: "Zeta", usageCount: 1 }),
      product({ id: "b", name: "Alpha", usageCount: 5 }),
      product({ id: "c", name: "Beta", usageCount: 5 }),
    ])
    expect(ranked.map((item) => item.name)).toEqual(["Alpha", "Beta", "Zeta"])
  })

  it("returns only the top six results for display", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      product({
        id: String(index),
        name: `Item ${index}`,
        usageCount: index,
      })
    )
    expect(takeTopFoodSearchResults(many)).toHaveLength(6)
    expect(takeTopFoodSearchResults(many)[0]?.usageCount).toBe(9)
  })

  it("filters cached products by all query words", () => {
    const pool = [
      product({ id: "1", name: "Spaghetti", brand: "Barilla" }),
      product({ id: "2", name: "Spaghetti", brand: "De Cecco" }),
    ]
    expect(filterFoodProductsByWords(pool, ["spaghetti", "barilla"])).toHaveLength(1)
  })
})

describe("planFoodProductSearch", () => {
  const emptyCache = { anchor: null, pool: [] }

  it("clears invalid queries", () => {
    expect(planFoodProductSearch("a", emptyCache)).toEqual({ kind: "clear" })
  })

  it("always RPCs on a single-word submit", () => {
    expect(planFoodProductSearch("barilla", emptyCache)).toEqual({
      kind: "rpc",
      term: "barilla",
    })
    expect(planFoodProductSearch("spaghetti", emptyCache)).toEqual({
      kind: "rpc",
      term: "spaghetti",
    })
  })

  it("filters cached results when the first word matches the anchor", () => {
    const barillaCache = {
      anchor: "barilla",
      pool: [
        product({ id: "1", name: "Barilla Sauce", brand: "Barilla" }),
        product({ id: "2", name: "Spaghetti", brand: "Barilla" }),
      ],
    }
    expect(planFoodProductSearch("barilla spaghetti", barillaCache)).toEqual({
      kind: "filter",
      words: ["barilla", "spaghetti"],
    })

    const spaghettiCache = {
      anchor: "spaghetti",
      pool: [
        product({ id: "1", name: "Spaghetti", brand: "Barilla" }),
        product({ id: "2", name: "Spaghetti", brand: "De Cecco" }),
      ],
    }
    expect(planFoodProductSearch("spaghetti barilla", spaghettiCache)).toEqual({
      kind: "filter",
      words: ["spaghetti", "barilla"],
    })
  })

  it("RPCs the first word when the anchor does not match", () => {
    const cache = {
      anchor: "spaghetti",
      pool: [product({ id: "1", name: "Spaghetti", brand: "Barilla" })],
    }
    expect(planFoodProductSearch("barilla pasta", cache)).toEqual({
      kind: "rpc",
      term: "barilla",
    })
  })
})
