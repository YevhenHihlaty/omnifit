import { describe, expect, it } from "vitest"
import { makeTranslator, translate } from "./translate"

describe("translate", () => {
  it("resolves a top-level dot key", () => {
    expect(translate("en", "home.tagline")).toContain("coach")
  })

  it("resolves a nested key", () => {
    expect(translate("en", "pricing.free.name")).toBe("Free")
  })

  it("returns the key for missing paths", () => {
    expect(translate("en", "does.not.exist")).toBe("does.not.exist")
  })

  it("falls back to en catalog value for unknown locale", () => {
    // @ts-expect-error intentional invalid locale
    expect(translate("xx", "home.tagline")).toContain("coach")
  })

  it("resolves Polish translations", () => {
    expect(translate("pl", "pricing.free.name")).toBe("Darmowy")
  })

  it("resolves Ukrainian translations", () => {
    expect(translate("uk", "pricing.free.name")).toBe("Безкоштовний")
  })

  it("keeps pl/uk legal and pricing features localized", () => {
    expect(translate("pl", "legal.privacyS1Title")).not.toBe(
      translate("en", "legal.privacyS1Title"),
    )
    expect(translate("uk", "legal.privacyS1Title")).not.toBe(
      translate("en", "legal.privacyS1Title"),
    )
    expect(translate("pl", "pricing.free.feature1")).not.toBe(
      translate("en", "pricing.free.feature1"),
    )
    expect(translate("uk", "pricing.perMonth")).toBe(" / міс.")
    expect(translate("pl", "pricing.perMonth")).toBe(" / mies.")
  })
})

describe("makeTranslator", () => {
  it("returns a curried fn that resolves keys", () => {
    const t = makeTranslator("en")
    expect(t("auth.signIn")).toBe("Sign in")
  })
})
