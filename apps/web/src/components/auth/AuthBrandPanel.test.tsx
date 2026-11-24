import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthBrandPanel } from "./AuthBrandPanel"

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/login"),
}))

vi.mock("@/lib/i18n/locale-store", () => ({
  useLocale: () => ({ locale: "en", setLocale: vi.fn(), locales: ["en", "pl", "uk"] }),
}))

vi.mock("@/lib/i18n/translate", () => ({
  translate: (_locale: string, key: string) => {
    const map: Record<string, string> = {
      "auth.loginQuote": "Fitness is a lifestyle, not a destination.",
      "auth.loginQuoteName": "Alex Coach",
      "auth.loginQuoteRole": "Certified Personal Trainer",
      "auth.loginQuoteInitials": "AC",
      "auth.signupEyebrow": "Start your trial",
      "auth.signupPanelTitle": "Everything you need",
      "auth.signupBenefit1": "Benefit one",
      "auth.signupBenefit2": "Benefit two",
      "auth.signupBenefit3": "Benefit three",
      "auth.signupBenefit4": "Benefit four",
      "auth.genericEyebrow": "OmniFit for coaches",
      "auth.genericPanelTitle": "Coaching without chaos",
      "auth.genericBenefit1": "Generic one",
      "auth.genericBenefit2": "Generic two",
      "auth.genericBenefit3": "Generic three",
      "auth.genericBenefit4": "Generic four",
      "footer.rights": "All rights reserved.",
    }
    return map[key] ?? key
  },
}))

describe("AuthBrandPanel", () => {
  beforeEach(async () => {
    const nav = await import("next/navigation")
    vi.mocked(nav.usePathname).mockReturnValue("/login")
  })

  it("renders the quote text on login", () => {
    render(<AuthBrandPanel />)
    expect(screen.getByText(/Fitness is a lifestyle/)).toBeInTheDocument()
  })

  it("renders the quote author name", () => {
    render(<AuthBrandPanel />)
    expect(screen.getByText("Alex Coach")).toBeInTheDocument()
  })

  it("renders signup benefits on /register", async () => {
    const nav = await import("next/navigation")
    vi.mocked(nav.usePathname).mockReturnValue("/register")
    render(<AuthBrandPanel />)
    expect(screen.getByText("Everything you need")).toBeInTheDocument()
    expect(screen.getByText("Benefit one")).toBeInTheDocument()
  })

  it("renders generic value props on /verify-email", async () => {
    const nav = await import("next/navigation")
    vi.mocked(nav.usePathname).mockReturnValue("/verify-email")
    render(<AuthBrandPanel />)
    expect(screen.getByText("Coaching without chaos")).toBeInTheDocument()
    expect(screen.getByText("Generic one")).toBeInTheDocument()
  })

  it("renders a link back to home", () => {
    render(<AuthBrandPanel />)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/")
  })
})
