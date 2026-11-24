import { describe, expect, it } from "vitest"
import { buildBookingStartsAt } from "./build-booking-starts-at"
import {
  formatBookingError,
  formatBookingSlot,
  mapBookingRequestRow,
} from "./map-booking-request"

describe("mapBookingRequestRow", () => {
  it("uses client name for coach view with email fallback", () => {
    const summary = mapBookingRequestRow(
      {
        id: "r1",
        coach_id: "c1",
        client_id: "u1",
        sport_type: "strength",
        starts_at: "2026-09-22T10:00:00Z",
        ends_at: "2026-09-22T11:00:00Z",
        duration_minutes: 60,
        status: "pending",
        client_note: "Leg day",
        decline_reason: null,
        session_id: null,
        created_at: "2026-09-21T12:00:00Z",
        client: { display_name: "", email: "priya@example.com" },
      },
      "coach"
    )
    expect(summary.counterpartName).toBe("priya")
    expect(summary.clientNote).toBe("Leg day")
  })

  it("uses coach display name for client view", () => {
    const summary = mapBookingRequestRow(
      {
        id: "r2",
        coach_id: "c1",
        client_id: "u1",
        sport_type: "running",
        starts_at: "2026-09-23T09:00:00Z",
        ends_at: "2026-09-23T10:00:00Z",
        duration_minutes: 60,
        status: "accepted",
        client_note: null,
        decline_reason: null,
        session_id: "s1",
        created_at: "2026-09-21T12:00:00Z",
        coach: { display_name: "Taylor Coach", email: "t@example.com" },
      },
      "client"
    )
    expect(summary.counterpartName).toBe("Taylor Coach")
    expect(summary.sessionId).toBe("s1")
  })

  it("falls back to role label when profile missing", () => {
    const summary = mapBookingRequestRow(
      {
        id: "r3",
        coach_id: "c1",
        client_id: "u1",
        sport_type: "cycling",
        starts_at: "2026-09-24T09:00:00Z",
        ends_at: "2026-09-24T09:45:00Z",
        duration_minutes: 45,
        status: "declined",
        client_note: null,
        decline_reason: "Busy",
        session_id: null,
        created_at: "2026-09-21T12:00:00Z",
      },
      "coach"
    )
    expect(summary.counterpartName).toBe("Client")
  })
})

describe("formatBookingSlot", () => {
  it("formats date and time range", () => {
    const label = formatBookingSlot(
      "2026-09-22T10:00:00Z",
      60,
      "en",
      "2026-09-22T11:00:00Z"
    )
    expect(label).toContain("·")
    expect(label).toContain("–")
    expect(label).not.toContain("60 min")
  })
})

describe("formatBookingError", () => {
  it("maps known codes", () => {
    expect(
      formatBookingError("phone_required", {
        phone_required: "Add a phone number first",
        generic: "Something went wrong",
      })
    ).toBe("Add a phone number first")
  })

  it("normalizes reason_required and falls back", () => {
    expect(
      formatBookingError("reason_required", {
        decline_reason_required: "A reason is required",
        generic: "Something went wrong",
      })
    ).toBe("A reason is required")
    expect(
      formatBookingError("weird", { generic: "Something went wrong" })
    ).toBe("Something went wrong")
    expect(formatBookingError("weird", {})).toBe("weird")
  })
})

describe("buildBookingStartsAt", () => {
  it("builds ISO for UTC wall time", () => {
    const iso = buildBookingStartsAt("2026-09-22", "10:30", "UTC")
    expect(iso).toBe("2026-09-22T10:30:00.000Z")
  })

  it("builds a plausible instant for Europe/Warsaw", () => {
    const iso = buildBookingStartsAt("2026-01-15", "12:00", "Europe/Warsaw")
    expect(iso).toBeTruthy()
    // winter CET = UTC+1 → 11:00Z
    expect(iso).toBe("2026-01-15T11:00:00.000Z")
  })

  it("returns null for bad input", () => {
    expect(buildBookingStartsAt("bad", "10:00", "UTC")).toBeNull()
    expect(buildBookingStartsAt("2026-09-22", "25:00", "UTC")).toBeNull()
  })
})
