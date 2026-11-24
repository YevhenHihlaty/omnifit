import { describe, expect, it, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { LocaleProvider, useLocale } from "./locale-store"

const Probe = () => {
  const { locale } = useLocale()
  return <span data-testid="locale">{locale}</span>
}

describe("LocaleProvider", () => {
  afterEach(() => {
    cleanup()
  })

  it("seeds locale from initialLocale so SSR matches hydration", () => {
    render(
      <LocaleProvider initialLocale="uk">
        <Probe />
      </LocaleProvider>
    )
    expect(screen.getByTestId("locale")).toHaveTextContent("uk")
  })

  it("throws when useLocale is used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(/LocaleProvider/)
    spy.mockRestore()
  })
})
