import { describe, expect, it } from "vitest"
import {
  clampProductGrams,
  decrementProductGrams,
  decrementProductQuantity,
  formatDraftQuantityGrams,
  formatGramsDisplay,
  formatQuantityDisplay,
  getDefaultProductGrams,
  gramsToQuantityServings,
  incrementProductGrams,
  incrementProductQuantity,
  parseGramsInput,
  PRODUCT_DETAIL_MIN_QUANTITY,
  quantityServingsToGrams,
} from "./product-quantity"

describe("product quantity stepper", () => {
  it("increments by 0.5", () => {
    expect(incrementProductQuantity(1)).toBe(1.5)
    expect(incrementProductQuantity(1.5)).toBe(2)
  })

  it("decrements by 0.5 but not below minimum", () => {
    expect(decrementProductQuantity(2)).toBe(1.5)
    expect(decrementProductQuantity(PRODUCT_DETAIL_MIN_QUANTITY)).toBe(
      PRODUCT_DETAIL_MIN_QUANTITY
    )
  })

  it("formats quantity without trailing zero for whole numbers", () => {
    expect(formatQuantityDisplay(1)).toBe("1")
    expect(formatQuantityDisplay(1.5)).toBe("1.5")
  })
})

describe("product grams quantity", () => {
  it("defaults to a full serving in grams", () => {
    expect(getDefaultProductGrams(25)).toBe(25)
    expect(getDefaultProductGrams(250)).toBe(250)
  })

  it("converts grams to servings for macro scaling", () => {
    expect(gramsToQuantityServings(12.5, 25)).toBe(0.5)
    expect(gramsToQuantityServings(25, 25)).toBe(1)
  })

  it("converts servings back to grams", () => {
    expect(quantityServingsToGrams(0.5, 25)).toBe(12.5)
    expect(quantityServingsToGrams(1, 250)).toBe(250)
  })

  it("formats draft builder quantity as grams with g suffix", () => {
    expect(formatDraftQuantityGrams(0.5, 250)).toBe("125g")
    expect(formatDraftQuantityGrams(1, 250)).toBe("250g")
    expect(formatDraftQuantityGrams(1.5, 100)).toBe("150g")
    expect(formatDraftQuantityGrams(0.5, null)).toBe("50g")
  })

  it("steps grams by half serving", () => {
    expect(incrementProductGrams(12.5, 25)).toBe(25)
    expect(decrementProductGrams(25, 25)).toBe(12.5)
    expect(decrementProductGrams(12.5, 25)).toBe(12.5)
  })

  it("formats and parses gram values", () => {
    expect(formatGramsDisplay(12.5)).toBe("12.5")
    expect(formatGramsDisplay(25)).toBe("25")
    expect(parseGramsInput("12,5")).toBe(12.5)
    expect(parseGramsInput("")).toBeNull()
    expect(parseGramsInput("abc")).toBeNull()
  })

  it("clamps grams to minimum half serving", () => {
    expect(clampProductGrams(0, 25)).toBe(12.5)
    expect(clampProductGrams(50, 25)).toBe(50)
  })
})
