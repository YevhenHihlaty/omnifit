"use client"

import { useEffect, useRef, useState } from "react"
import { FOOD_SEARCH_MIN_QUERY_LENGTH } from "./constants"
import {
  filterFoodProductsByWords,
  isFoodSearchQueryValid,
  planFoodProductSearch,
  takeTopFoodSearchResults,
  type FoodSearchCacheState,
} from "./search"
import type { FoodProductListItem } from "./types"

export const useFoodProductSearch = (
  submittedQuery: string,
  searchProducts: (rpcTerm: string) => Promise<FoodProductListItem[]>
) => {
  const [results, setResults] = useState<FoodProductListItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const requestIdRef = useRef(0)
  const cacheRef = useRef<FoodSearchCacheState>({ anchor: null, pool: [] })

  const trimmedSubmitted = submittedQuery.trim()
  const isActiveSearch = trimmedSubmitted.length >= FOOD_SEARCH_MIN_QUERY_LENGTH

  useEffect(() => {
    if (!isFoodSearchQueryValid(submittedQuery)) {
      requestIdRef.current += 1
      cacheRef.current = { anchor: null, pool: [] }
      setResults([])
      setIsSearching(false)
      setSearchFailed(false)
      return
    }

    const plan = planFoodProductSearch(submittedQuery, cacheRef.current)

    if (plan.kind === "clear") {
      requestIdRef.current += 1
      cacheRef.current = { anchor: null, pool: [] }
      setResults([])
      setIsSearching(false)
      setSearchFailed(false)
      return
    }

    if (plan.kind === "filter") {
      requestIdRef.current += 1
      setIsSearching(false)
      setSearchFailed(false)
      setResults(
        takeTopFoodSearchResults(
          filterFoodProductsByWords(cacheRef.current.pool, plan.words)
        )
      )
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsSearching(true)
    setSearchFailed(false)
    setResults([])

    void (async () => {
      try {
        const pool = await searchProducts(plan.term)
        if (requestId !== requestIdRef.current) return
        cacheRef.current = { anchor: plan.term, pool }
        setResults(takeTopFoodSearchResults(pool))
      } catch {
        if (requestId !== requestIdRef.current) return
        cacheRef.current = { anchor: null, pool: [] }
        setResults([])
        setSearchFailed(true)
      } finally {
        if (requestId === requestIdRef.current) setIsSearching(false)
      }
    })()
  }, [submittedQuery, searchProducts, trimmedSubmitted])

  return {
    results: isActiveSearch ? results : [],
    isSearching: isActiveSearch && isSearching,
    isActiveSearch,
    searchFailed: isActiveSearch && searchFailed,
  }
}
