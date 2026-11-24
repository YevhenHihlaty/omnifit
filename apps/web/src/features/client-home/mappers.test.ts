import { describe, expect, it } from "vitest"
import {
  buildCalorieRing,
  filterHabitsForCoach,
  habitsForHome,
  ringForFocus,
  selectFocusedCoach,
  shouldShowCoachesStrip,
  habitDoneCount,
} from "./mappers"
import { fixture0Coaches, fixture1Coach, fixture3Coaches } from "./fixtures"

describe("buildCalorieRing", () => {
  it("progresses against a single target", () => {
    const ring = buildCalorieRing(1450, 2100)
    expect(ring.progress).toBeCloseTo(1450 / 2100)
    expect(ring.remainingKcal).toBe(650)
  })

  it("returns null target when no coach target", () => {
    const ring = buildCalorieRing(400, null)
    expect(ring.targetKcal).toBeNull()
    expect(ring.progress).toBe(0)
  })
})

describe("selectFocusedCoach — no merge", () => {
  it("returns null for 0 coaches", () => {
    expect(selectFocusedCoach(fixture0Coaches().coaches, null)).toBeNull()
  })

  it("defaults to first coach for 1 coach", () => {
    const snap = fixture1Coach()
    expect(selectFocusedCoach(snap.coaches, null)?.coachId).toBe("coach-a")
  })

  it("returns each coach's distinct target when focused", () => {
    const snap = fixture3Coaches()
    const a = selectFocusedCoach(snap.coaches, "coach-a")
    const b = selectFocusedCoach(snap.coaches, "coach-b")
    const c = selectFocusedCoach(snap.coaches, "coach-c")
    expect(a?.targetKcal).toBe(2100)
    expect(b?.targetKcal).toBe(1800)
    expect(c?.targetKcal).toBe(2500)
    // never average
    expect((a!.targetKcal! + b!.targetKcal! + c!.targetKcal!) / 3).not.toBe(
      a!.targetKcal
    )
  })
})

describe("ringForFocus", () => {
  it("switches ring target without merging", () => {
    const snap = fixture3Coaches()
    expect(ringForFocus(snap, "coach-a").targetKcal).toBe(2100)
    expect(ringForFocus(snap, "coach-b").targetKcal).toBe(1800)
    expect(ringForFocus(snap, "coach-c").targetKcal).toBe(2500)
  })
})

describe("filterHabitsForCoach", () => {
  it("can filter to focused coach when needed", () => {
    const snap = fixture3Coaches()
    const habits = filterHabitsForCoach(snap.habits, "coach-a")
    expect(habits.every((h) => h.coachId === "coach-a")).toBe(true)
    expect(habits.length).toBeGreaterThan(0)
  })
})

describe("habitsForHome", () => {
  it("keeps all coaches' habits (chips do not scope the list)", () => {
    const snap = fixture3Coaches()
    expect(habitsForHome(snap.habits)).toHaveLength(snap.habits.length)
  })
})

describe("shouldShowCoachesStrip", () => {
  it("hides for 0 and 1, shows for 3", () => {
    expect(shouldShowCoachesStrip(0)).toBe(false)
    expect(shouldShowCoachesStrip(1)).toBe(false)
    expect(shouldShowCoachesStrip(3)).toBe(true)
  })
})

describe("habitDoneCount", () => {
  it("counts done habits", () => {
    const snap = fixture1Coach()
    expect(habitDoneCount(snap.habits)).toEqual({ done: 1, total: 2 })
  })
})
