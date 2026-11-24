import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LogHubView } from "./LogHubView"
import { buildLogHubLabels } from "./labels"

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const labels = buildLogHubLabels((key) => {
  const map: Record<string, string> = {
    "logHub.title": "Log",
    "logHub.subtitle": "What would you like to log today?",
    "logHub.getStarted": "Get started",
    "shell.comingSoon": "Coming soon",
    "logHub.mealTitle": "Log meal",
    "logHub.mealDescription": "Search foods",
    "logHub.trainingTitle": "Log training",
    "logHub.trainingDescription": "Record sets",
    "logHub.metricsTitle": "Body metrics",
    "logHub.metricsDescription": "Log weight",
    "logHub.waterTitle": "Water",
    "logHub.waterDescription": "Add a glass",
  }
  return map[key] ?? key
})

describe("LogHubView", () => {
  it("renders meal, training, metrics live and water coming soon", () => {
    render(<LogHubView labels={labels} />)
    expect(screen.getByRole("heading", { name: "Log" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Log meal/i })).toHaveAttribute(
      "href",
      "/log/meal"
    )
    expect(screen.getByRole("link", { name: /Log training/i })).toHaveAttribute(
      "href",
      "/log/training"
    )
    expect(screen.getByRole("link", { name: /Body metrics/i })).toHaveAttribute(
      "href",
      "/log/body"
    )
    expect(screen.getAllByText("Coming soon")).toHaveLength(1)
    expect(screen.getByText("Water")).toBeInTheDocument()
  })
})
