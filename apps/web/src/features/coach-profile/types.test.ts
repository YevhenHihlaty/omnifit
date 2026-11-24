import { describe, expect, it } from "vitest"
import { formatPlanPrice, parseCredentialsSnapshot } from "./types"

describe("parseCredentialsSnapshot", () => {
  it("reads nested credentials", () => {
    const parsed = parseCredentialsSnapshot({
      credentials: {
        yearsExperience: "8",
        certifications: "CSCS",
        education: "MS",
        specialtiesText: "Strength",
      },
    })
    expect(parsed.yearsExperience).toBe("8")
    expect(parsed.certifications).toBe("CSCS")
  })

  it("returns empty on null", () => {
    expect(parseCredentialsSnapshot(null).yearsExperience).toBe("")
  })
})

describe("formatPlanPrice", () => {
  it("formats whole dollars", () => {
    expect(formatPlanPrice(5000, "USD")).toContain("50")
  })
})
