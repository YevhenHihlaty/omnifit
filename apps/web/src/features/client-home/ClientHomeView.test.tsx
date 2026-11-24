import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ClientHomeView } from "./ClientHomeView"
import { buildClientHomeLabels } from "./labels"
import { fixture0Coaches, fixture1Coach, fixture3Coaches } from "./fixtures"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock("./toggle-habit-completion", () => ({
  toggleHabitCompletion: vi.fn(),
}))

const labels = buildClientHomeLabels((key) => {
  const map: Record<string, string> = {
    "clientHome.greetingMorning": "Good morning, {name}",
    "clientHome.greetingAfternoon": "Good afternoon, {name}",
    "clientHome.greetingEvening": "Good evening, {name}",
    "clientHome.caloriesToday": "Calories today",
    "clientHome.kcalUnit": "kcal",
    "clientHome.noTarget": "no target set",
    "clientHome.protein": "Protein",
    "clientHome.carbs": "Carbs",
    "clientHome.fat": "Fat",
    "clientHome.logMeal": "Log meal",
    "clientHome.logTraining": "Log training",
    "clientHome.checkinDue": "Weekly check-in due",
    "clientHome.checkinCta": "Check in",
    "clientHome.bodyMetrics": "Body metrics",
    "shell.comingSoon": "Coming soon",
    "clientHome.habitsTitle": "Today's habits",
    "clientHome.habitsDone": "{done} of {total} done",
    "clientHome.habitsEmpty": "No habits",
    "clientHome.habitsEmptyNoCoach": "Accept an invite",
    "clientHome.habitsToggleError": "Couldn't update that habit. Try again.",
    "clientHome.coachesStripTitle": "Your coaches",
    "clientHome.coachesStripManage": "Manage",
    "clientHome.upcomingTitle": "Upcoming session",
    "clientHome.upcomingNone": "No upcoming sessions.",
    "clientHome.messagesTitle": "Messages",
    "clientHome.messagesEmpty": "No messages yet.",
    "clientHome.messagesViewAll": "View all",
    "clientHome.withCoach": "with {name}",
    "clientHome.targetChipAria": "Nutrition target by coach",
    "clientHome.zeroCoachesTitle": "No coaches yet",
    "clientHome.zeroCoachesBody": "Accept an invite.",
    "clientHome.zeroCoachesCta": "View my coaches",
    "clientHome.minutesSuffix": "min",
  }
  return map[key] ?? key
})

describe("ClientHomeView — 0/1/3 coaches", () => {
  it("shows zero-coach empty state", () => {
    render(
      <ClientHomeView
        snapshot={fixture0Coaches()}
        labels={labels}
        displayName="Alex"
      />
    )
    expect(screen.getByText("No coaches yet")).toBeInTheDocument()
    expect(screen.getByText(/View my coaches/)).toBeInTheDocument()
    expect(screen.getByText("Calories today")).toBeInTheDocument()
    expect(screen.getByText(/no target set/)).toBeInTheDocument()
    expect(screen.queryByText("Your coaches")).not.toBeInTheDocument()
  })

  it("shows calorie hero for 1 coach without strip", () => {
    render(
      <ClientHomeView
        snapshot={fixture1Coach()}
        labels={labels}
        displayName="Alex Romero"
      />
    )
    expect(screen.getByText("Calories today")).toBeInTheDocument()
    expect(screen.getByText(/2[\s,]?100/)).toBeInTheDocument()
    expect(screen.getByText("98g")).toBeInTheDocument()
    expect(screen.getByText("140g")).toBeInTheDocument()
    expect(screen.getByText("42g")).toBeInTheDocument()
    expect(screen.queryByText("Your coaches")).not.toBeInTheDocument()
    expect(screen.getByText("Drink water")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Log meal" })).toHaveAttribute(
      "href",
      "/log/meal"
    )
    expect(screen.getByRole("link", { name: "Log training" })).toHaveAttribute(
      "href",
      "/log/training"
    )
    expect(screen.getByRole("link", { name: "Body metrics" })).toHaveAttribute(
      "href",
      "/log/body"
    )
  })

  it("shows coach chips and strip for 3 coaches; chips switch target not habits", () => {
    render(
      <ClientHomeView
        snapshot={fixture3Coaches()}
        labels={labels}
        displayName="Alex"
      />
    )
    expect(screen.getByRole("tablist")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Taylor/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Jordan/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Sam/ })).toBeInTheDocument()
    expect(screen.getByText("Your coaches")).toBeInTheDocument()
    // All coaches' habits stay visible (chips do not filter the list)
    expect(screen.getByText("Protein shake")).toBeInTheDocument()
    expect(screen.getByText("Mobility 10 min")).toBeInTheDocument()
    expect(screen.getByText("Sleep by 11")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Jordan/ }))
    expect(screen.getByRole("tab", { name: /Jordan/ })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByText(/\/ 1[\s,]?800 kcal/)).toBeInTheDocument()
    expect(screen.getByText("Mobility 10 min")).toBeInTheDocument()
    expect(screen.getByText("Protein shake")).toBeInTheDocument()
  })
})
