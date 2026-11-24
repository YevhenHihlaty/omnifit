import { describe, expect, it } from "vitest"
import { parseLocaleFromCookie, serializeLocaleCookie } from "./locale-cookie"

describe("parseLocaleFromCookie", () => {
  it("returns default when cookie header is undefined", () => {
    expect(parseLocaleFromCookie(undefined)).toBe("en")
  })

  it("returns default when cookie header is empty", () => {
    expect(parseLocaleFromCookie("")).toBe("en")
  })

  it("parses a valid locale cookie", () => {
    expect(parseLocaleFromCookie("of-locale=pl")).toBe("pl")
  })

  it("parses locale from multi-cookie header", () => {
    expect(parseLocaleFromCookie("session=abc; of-locale=uk; other=x")).toBe("uk")
  })

  it("ignores an invalid locale value", () => {
    expect(parseLocaleFromCookie("of-locale=fr")).toBe("en")
  })
})

describe("serializeLocaleCookie", () => {
  it("produces a Set-Cookie with the locale value", () => {
    const cookie = serializeLocaleCookie("pl")
    expect(cookie).toContain("of-locale=pl")
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("SameSite=Lax")
  })
})
