import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Toggle } from "@omnifit/ui"

describe("Toggle", () => {
  it("renders with correct aria-checked when unchecked", () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Dark mode" />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
  })

  it("renders with correct aria-checked when checked", () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="Dark mode" />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })

  it("calls onChange when clicked", () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="Feature" />)
    fireEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} disabled label="Feature" />)
    expect(screen.getByRole("switch")).toBeDisabled()
  })
})
