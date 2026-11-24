import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avatar } from "@omnifit/ui"

describe("Avatar", () => {
  it("renders initials for a full name", () => {
    render(<Avatar name="Jane Doe" />)
    expect(screen.getByLabelText("Jane Doe")).toHaveTextContent("JD")
  })

  it("renders first two chars for single name", () => {
    render(<Avatar name="Alex" />)
    expect(screen.getByLabelText("Alex")).toHaveTextContent("AL")
  })

  it("renders img when src is provided", () => {
    render(<Avatar name="Jane Doe" src="https://example.com/avatar.png" />)
    const img = screen.getByRole("img", { name: "Jane Doe" })
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png")
  })

  it("falls back to initials when src is null", () => {
    render(<Avatar name="Jane Doe" src={null} />)
    expect(screen.getByLabelText("Jane Doe")).toHaveTextContent("JD")
  })
})
