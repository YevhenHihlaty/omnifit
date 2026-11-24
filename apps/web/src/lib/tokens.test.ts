import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const tokensPath = resolve(__dirname, "../../../../packages/shared/tokens.css")
const css = readFileSync(tokensPath, "utf8")

describe("OmniFit design tokens", () => {
  const expectedTokens: [string, string][] = [
    ["--of-pine", "#3F6B4F"],
    ["--of-pine-dark", "#2C4F39"],
    ["--of-pine-tint", "#DCEBE0"],
    ["--of-plum", "#7C6A9C"],
    ["--of-plum-dark", "#5C4E78"],
    ["--of-cream", "#FBF7EF"],
    ["--of-surface", "#FFFFFF"],
    ["--of-ink-900", "#14181C"],
    ["--of-ink-700", "#3E443F"],
    ["--of-ink-500", "#6E7268"],
    ["--of-stone-300", "#E3DECF"],
    ["--of-stone-150", "#F1ECDF"],
    ["--of-sage", "#BFE0C2"],
    ["--of-sage-tint", "#E8F0E4"],
    ["--of-butter", "#F7E5A0"],
    ["--of-peach", "#F8D9BE"],
    ["--of-peach-tint", "#FBEDE1"],
    ["--of-peach-dark", "#A15A2E"],
    ["--of-lilac", "#DDD2F3"],
    ["--of-lilac-tint", "#F1EBFA"],
    ["--of-blush", "#F8CFDD"],
    ["--of-sky", "#C3DCF4"],
    ["--of-sky-tint", "#EAF3F8"],
    ["--of-sky-dark", "#3A6E8C"],
    ["--of-danger", "#C1503D"],
    ["--of-danger-tint", "#F6DAD3"],
    ["--of-warning", "#B8842A"],
    ["--of-warning-tint", "#F7E5A0"],
  ]

  for (const [token, hex] of expectedTokens) {
    it(`${token} resolves to ${hex}`, () => {
      expect(css).toContain(hex)
      expect(css).toContain(token)
    })
  }
})
