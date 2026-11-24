import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusPill } from "@omnifit/ui"

describe("StatusPill", () => {
  it("renders the label", () => {
    render(<StatusPill label="Active" />)
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("applies active variant classes", () => {
    render(<StatusPill label="Active" variant="active" />)
    const el = screen.getByText("Active")
    expect(el.className).toContain("bg-pine-tint")
  })

  it("applies danger variant classes", () => {
    render(<StatusPill label="Error" variant="danger" />)
    expect(screen.getByText("Error").className).toContain("text-danger")
  })

  it("applies new (lilac) variant classes", () => {
    render(<StatusPill label="New" variant="new" />)
    const el = screen.getByText("New")
    expect(el.className).toContain("bg-lilac")
    expect(el.className).toContain("text-plum-dark")
  })
})
