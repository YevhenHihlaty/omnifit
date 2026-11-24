import { describe, expect, it } from "vitest"
import { absoluteUrl, marketingMetadata, noIndexMetadata } from "@/lib/seo/metadata"

describe("seo metadata", () => {
  it("builds absolute urls without trailing slash duplication", () => {
    expect(absoluteUrl("/pricing")).toMatch(/\/pricing$/)
    expect(absoluteUrl("pricing")).toMatch(/\/pricing$/)
  })

  it("marks marketing pages indexable", () => {
    const meta = marketingMetadata({
      title: "Pricing",
      description: "Plans",
      path: "/pricing",
    })
    expect(meta.robots).toEqual({ index: true, follow: true })
    expect(meta.title).toBe("Pricing")
  })

  it("exports noindex for app shells", () => {
    expect(noIndexMetadata.robots).toMatchObject({ index: false })
  })
})
