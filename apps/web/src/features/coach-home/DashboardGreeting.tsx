"use client"

type DashboardGreetingProps = {
  displayName: string
  greetingMorning: string
  greetingAfternoon: string
  greetingEvening: string
  subtitle: string
}

export const DashboardGreeting = ({
  displayName,
  greetingMorning,
  greetingAfternoon,
  greetingEvening,
  subtitle,
}: DashboardGreetingProps) => {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName
  const hour = new Date().getHours()
  const template =
    hour < 12 ? greetingMorning : hour < 18 ? greetingAfternoon : greetingEvening
  const greeting = template.replace("{name}", firstName)

  return (
    <div>
      <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.01em] text-ink-900">
        {greeting}
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
    </div>
  )
}
