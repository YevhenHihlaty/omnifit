import { render, screen, fireEvent } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LocaleSwitcher } from "./LocaleSwitcher"

const setLocale = vi.fn()

vi.mock("@/lib/i18n/locale-store", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale,
    locales: ["en", "pl", "uk"] as const,
  }),
}))

vi.mock("@/lib/i18n/translate", () => ({
  translate: (_locale: string, key: string) => {
    const map: Record<string, string> = {
      "nav.language": "Language",
      "nav.langEn": "English",
      "nav.langPl": "Polski",
      "nav.langUk": "Українська",
    }
    return map[key] ?? key
  },
}))

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    setLocale.mockClear()
  })

  it("shows the current locale code when folded", () => {
    render(<LocaleSwitcher />)
    expect(screen.getByRole("button", { name: "Language" })).toHaveAttribute(
      "aria-expanded",
      "false"
    )
    expect(screen.getByRole("button", { name: "Language" })).toHaveTextContent("EN")
  })

  it("slides open the language list on click", () => {
    render(<LocaleSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Language" }))
    expect(screen.getByRole("button", { name: "Language" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    expect(screen.getByRole("option", { name: /English/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Polski/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Українська/ })).toBeInTheDocument()
  })

  it("selects a language from the open list", () => {
    render(<LocaleSwitcher />)
    fireEvent.click(screen.getByRole("button", { name: "Language" }))
    fireEvent.click(screen.getByRole("option", { name: /Polski/ }))
    expect(setLocale).toHaveBeenCalledWith("pl")
  })
})
