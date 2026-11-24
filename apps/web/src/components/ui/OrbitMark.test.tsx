import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OrbitMark } from "@omnifit/ui"

describe("OrbitMark", () => {
  it("renders decorative svg without accessible name by default", () => {
    const { container } = render(<OrbitMark />)
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute("aria-hidden")).toBe("true")
  })

  it("exposes title when provided", () => {
    const { container } = render(<OrbitMark title="OmniFit" />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("aria-label")).toBe("OmniFit")
    expect(svg?.querySelector("title")?.textContent).toBe("OmniFit")
  })
})
