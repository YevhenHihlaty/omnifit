import { describe, expect, it } from "vitest"
import { resolveAuthRedirect } from "./resolve-auth-redirect"

describe("resolveAuthRedirect", () => {
  // ── sessionError ────────────────────────────────────────────────────────────

  it("redirects to /session-expired on sessionError for protected paths", () => {
    expect(resolveAuthRedirect("/dashboard", "sessionError")).toEqual({
      destination: "/session-expired",
    })
  })

  it("allows marketing through on sessionError so SEO stays up", () => {
    expect(resolveAuthRedirect("/", "sessionError")).toEqual({
      destination: null,
    })
    expect(resolveAuthRedirect("/pricing", "sessionError")).toEqual({
      destination: null,
    })
  })

  it("allows through when already on /session-expired during sessionError", () => {
    expect(resolveAuthRedirect("/session-expired", "sessionError")).toEqual({
      destination: null,
    })
  })

  it("allows SEO and offline utility paths through even on sessionError", () => {
    expect(resolveAuthRedirect("/robots.txt", "sessionError")).toEqual({
      destination: null,
    })
    expect(resolveAuthRedirect("/sitemap.xml", "sessionError")).toEqual({
      destination: null,
    })
    expect(resolveAuthRedirect("/offline", "sessionError")).toEqual({
      destination: null,
    })
  })

  it("allows login through on sessionError so users can recover", () => {
    expect(resolveAuthRedirect("/login", "sessionError")).toEqual({
      destination: null,
    })
  })

  // ── authenticated + auth-only paths → /dashboard ─────────────────────────────

  it("redirects authenticated user away from /login to /dashboard", () => {
    expect(resolveAuthRedirect("/login", "authenticated")).toEqual({
      destination: "/dashboard",
    })
  })

  it("redirects authenticated user away from /register to /dashboard", () => {
    expect(resolveAuthRedirect("/register", "authenticated")).toEqual({
      destination: "/dashboard",
    })
  })

  it("redirects authenticated user away from /forgot-password to /dashboard", () => {
    expect(resolveAuthRedirect("/forgot-password", "authenticated")).toEqual({
      destination: "/dashboard",
    })
  })

  // ── authenticated + protected / marketing paths → allow ──────────────────────

  it("allows authenticated user through to /dashboard", () => {
    expect(resolveAuthRedirect("/dashboard", "authenticated")).toEqual({
      destination: null,
    })
  })

  it("allows authenticated user through to /onboarding", () => {
    expect(resolveAuthRedirect("/onboarding", "authenticated")).toEqual({
      destination: null,
    })
  })

  it("allows authenticated user through to a marketing path", () => {
    expect(resolveAuthRedirect("/pricing", "authenticated")).toEqual({
      destination: null,
    })
  })

  it("allows authenticated user through to the home path", () => {
    expect(resolveAuthRedirect("/", "authenticated")).toEqual({
      destination: null,
    })
  })

  // ── unauthenticated + auth-only paths → allow ────────────────────────────────

  it("allows unauthenticated user through to /login", () => {
    expect(resolveAuthRedirect("/login", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /register", () => {
    expect(resolveAuthRedirect("/register", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /forgot-password", () => {
    expect(resolveAuthRedirect("/forgot-password", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /verify-email", () => {
    expect(resolveAuthRedirect("/verify-email", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /session-expired", () => {
    expect(resolveAuthRedirect("/session-expired", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("redirects authenticated user away from /verify-email to /dashboard", () => {
    expect(resolveAuthRedirect("/verify-email", "authenticated")).toEqual({
      destination: "/dashboard",
    })
  })

  it("redirects authenticated user away from /session-expired to /dashboard", () => {
    expect(resolveAuthRedirect("/session-expired", "authenticated")).toEqual({
      destination: "/dashboard",
    })
  })

  // ── unauthenticated + marketing paths → allow ────────────────────────────────

  it("allows unauthenticated user through to /", () => {
    expect(resolveAuthRedirect("/", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /pricing", () => {
    expect(resolveAuthRedirect("/pricing", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /privacy", () => {
    expect(resolveAuthRedirect("/privacy", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /terms", () => {
    expect(resolveAuthRedirect("/terms", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /offline", () => {
    expect(resolveAuthRedirect("/offline", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to robots and sitemap", () => {
    expect(resolveAuthRedirect("/robots.txt", "unauthenticated")).toEqual({
      destination: null,
    })
    expect(resolveAuthRedirect("/sitemap.xml", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  // ── unauthenticated + protected paths → /login ──────────────────────────────

  it("redirects unauthenticated user from /dashboard to /login", () => {
    expect(resolveAuthRedirect("/dashboard", "unauthenticated")).toEqual({
      destination: "/login",
    })
  })

  it("redirects unauthenticated user from /onboarding to /login", () => {
    expect(resolveAuthRedirect("/onboarding", "unauthenticated")).toEqual({
      destination: "/login",
    })
  })

  it("redirects unauthenticated user from an unknown protected path to /login", () => {
    expect(resolveAuthRedirect("/coach/clients", "unauthenticated")).toEqual({
      destination: "/login",
    })
  })

  // ── auth-flow passthrough (callback / password update) ─────────────────────

  it("allows unauthenticated user through to /auth/callback", () => {
    expect(resolveAuthRedirect("/auth/callback", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows unauthenticated user through to /reset-password/update", () => {
    expect(resolveAuthRedirect("/reset-password/update", "unauthenticated")).toEqual({
      destination: null,
    })
  })

  it("allows authenticated user through to /reset-password/update (recovery session)", () => {
    expect(resolveAuthRedirect("/reset-password/update", "authenticated")).toEqual({
      destination: null,
    })
  })

  it("allows authenticated user through to /auth/callback", () => {
    expect(resolveAuthRedirect("/auth/callback", "authenticated")).toEqual({
      destination: null,
    })
  })

  // ── client invite (public prefix) ───────────────────────────────────────────

  it("allows unauthenticated user through to client invite accept path", () => {
    expect(
      resolveAuthRedirect("/invite/client/some-token", "unauthenticated")
    ).toEqual({ destination: null })
  })

  it("allows authenticated client through to client invite accept path", () => {
    expect(
      resolveAuthRedirect("/invite/client/some-token", "authenticated")
    ).toEqual({ destination: null })
  })

  it("redirects unauthenticated user from client home to login", () => {
    expect(resolveAuthRedirect("/home", "unauthenticated")).toEqual({
      destination: "/login",
    })
  })
})
