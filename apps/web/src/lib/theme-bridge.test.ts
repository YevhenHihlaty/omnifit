import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

/** Ensures Tailwind v4 @theme wires Design Doc colors (not default stone greys). */
describe("Tailwind @theme color bridge", () => {
  const css = readFileSync(
    resolve(__dirname, "../styles/globals.css"),
    "utf8"
  )

  const themeBindings: [string, string][] = [
    ["--color-pine", "var(--of-pine)"],
    ["--color-cream", "var(--of-cream)"],
    ["--color-ink-900", "var(--of-ink-900)"],
    ["--color-stone-300", "var(--of-stone-300)"],
    ["--color-plum", "var(--of-plum)"],
    ["--color-lilac", "var(--of-lilac)"],
    ["--color-warning-tint", "var(--of-warning-tint)"],
    ["--color-danger-tint", "var(--of-danger-tint)"],
  ]

  for (const [themeVar, ofVar] of themeBindings) {
    it(`maps ${themeVar} → ${ofVar}`, () => {
      expect(css).toContain(themeVar)
      expect(css).toContain(ofVar)
    })
  }

  it("does not leave stone-300 on default Tailwind greys only", () => {
    // Design Doc warm stone must be present as the OmniFit binding
    expect(css).toMatch(/--color-stone-300:\s*var\(--of-stone-300\)/)
  })
})
