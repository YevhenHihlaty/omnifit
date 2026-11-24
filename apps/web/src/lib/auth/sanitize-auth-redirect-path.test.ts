import { describe, expect, it } from "vitest"
import { sanitizeAuthRedirectPath } from "./sanitize-auth-redirect-path"

const SAFE = "/dashboard" // default fallback

describe("sanitizeAuthRedirectPath", () => {
  // ── Safe paths allowed through ────────────────────────────────────────────────

  it("allows a simple relative path", () => {
    expect(sanitizeAuthRedirectPath("/profile")).toBe("/profile")
  })

  it("allows a nested relative path", () => {
    expect(sanitizeAuthRedirectPath("/onboarding/profile")).toBe("/onboarding/profile")
  })

  it("allows a path with query string", () => {
    expect(sanitizeAuthRedirectPath("/dashboard?tab=clients")).toBe(
      "/dashboard?tab=clients"
    )
  })

  it("allows a path with a hash fragment", () => {
    expect(sanitizeAuthRedirectPath("/settings#notifications")).toBe(
      "/settings#notifications"
    )
  })

  // ── Protocol-relative open-redirect (//) ────────────────────────────────────

  it("rejects protocol-relative URL starting with //", () => {
    expect(sanitizeAuthRedirectPath("//evil.com")).toBe(SAFE)
  })

  it("rejects //evil.com/phish path", () => {
    expect(sanitizeAuthRedirectPath("//evil.com/phish")).toBe(SAFE)
  })

  // ── Absolute URLs with scheme (://) ──────────────────────────────────────────

  it("rejects http:// absolute URL", () => {
    expect(sanitizeAuthRedirectPath("http://evil.com")).toBe(SAFE)
  })

  it("rejects https:// absolute URL", () => {
    expect(sanitizeAuthRedirectPath("https://evil.com/steal")).toBe(SAFE)
  })

  it("rejects javascript:// XSS vector", () => {
    expect(sanitizeAuthRedirectPath("javascript://evil")).toBe(SAFE)
  })

  it("rejects data: scheme", () => {
    expect(sanitizeAuthRedirectPath("data://text/html,<h1>")).toBe(SAFE)
  })

  // ── Backslash (Windows / IE open-redirect vector) ────────────────────────────

  it("rejects path with a backslash", () => {
    expect(sanitizeAuthRedirectPath("/\\evil.com")).toBe(SAFE)
  })

  it("rejects Windows-style path", () => {
    expect(sanitizeAuthRedirectPath("\\evil")).toBe(SAFE)
  })

  // ── Paths not starting with / ─────────────────────────────────────────────────

  it("rejects a bare hostname with no leading slash", () => {
    expect(sanitizeAuthRedirectPath("evil.com")).toBe(SAFE)
  })

  it("rejects a relative path without leading slash", () => {
    expect(sanitizeAuthRedirectPath("dashboard")).toBe(SAFE)
  })

  // ── Null / undefined / empty ─────────────────────────────────────────────────

  it("returns fallback when path is null", () => {
    expect(sanitizeAuthRedirectPath(null)).toBe(SAFE)
  })

  it("returns fallback when path is undefined", () => {
    expect(sanitizeAuthRedirectPath(undefined)).toBe(SAFE)
  })

  it("returns fallback when path is an empty string", () => {
    expect(sanitizeAuthRedirectPath("")).toBe(SAFE)
  })

  // ── Custom fallback ───────────────────────────────────────────────────────────

  it("uses the provided custom fallback on rejection", () => {
    expect(sanitizeAuthRedirectPath("//evil.com", "/login")).toBe("/login")
  })
})
