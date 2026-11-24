import Link from "next/link"
import { ROUTES } from "@/lib/routes"
import type { LogHubLabels } from "./labels"

type LogHubCard = {
  id: string
  href?: string
  title: string
  description: string
  iconBg: string
  icon: "meal" | "training" | "metrics" | "water"
  disabled?: boolean
}

type LogHubViewProps = {
  labels: LogHubLabels
}

export const LogHubView = ({ labels }: LogHubViewProps) => {
  const cards: LogHubCard[] = [
    {
      id: "meal",
      href: ROUTES.clientLogMeal,
      title: labels.mealTitle,
      description: labels.mealDescription,
      iconBg: "bg-peach",
      icon: "meal",
    },
    {
      id: "training",
      href: ROUTES.clientLogTraining,
      title: labels.trainingTitle,
      description: labels.trainingDescription,
      iconBg: "bg-sage",
      icon: "training",
    },
    {
      id: "metrics",
      href: ROUTES.clientLogBody,
      title: labels.metricsTitle,
      description: labels.metricsDescription,
      iconBg: "bg-lilac",
      icon: "metrics",
    },
    {
      id: "water",
      title: labels.waterTitle,
      description: labels.waterDescription,
      iconBg: "bg-sky",
      icon: "water",
      disabled: true,
    },
  ]

  return (
    <div className="mx-auto max-w-[1160px]">
      <h1 className="font-display text-[30px] font-bold tracking-tight text-ink-900">
        {labels.title}
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-500">{labels.subtitle}</p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2">
        {cards.map((card) => {
          const body = (
            <>
              <span
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${card.iconBg} ${card.disabled ? "opacity-60" : ""}`}
                aria-hidden
              >
                <HubIcon kind={card.icon} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink-900">
                    {card.title}
                  </h2>
                  {card.disabled ? (
                    <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[11px] font-semibold text-ink-500">
                      {labels.comingSoon}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  {card.description}
                </p>
              </div>
              {!card.disabled ? (
                <span className="mt-auto flex items-center gap-1.5 text-[13px] font-semibold text-plum-dark">
                  {labels.getStarted}
                  <span aria-hidden>›</span>
                </span>
              ) : null}
            </>
          )

          if (!card.href || card.disabled) {
            return (
              <li
                key={card.id}
                className={`flex flex-col gap-3.5 rounded-2xl border border-stone-300 bg-surface p-[26px] ${card.disabled ? "opacity-60" : ""}`}
              >
                {body}
              </li>
            )
          }

          return (
            <li key={card.id}>
              <Link
                href={card.href}
                className="flex h-full flex-col gap-3.5 rounded-2xl border border-stone-300 bg-surface p-[26px] transition-colors hover:border-pine"
              >
                {body}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const HubIcon = ({ kind }: { kind: LogHubCard["icon"] }) => {
  const stroke = "var(--of-ink-900, #14181C)"
  if (kind === "meal") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 2v7a2 2 0 0 0 4 0V2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M9 11v11" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M17 2c-1.5 1.5-2 3.5-2 6s.5 4.5 2 6v8" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === "training") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === "metrics") {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="9" width="18" height="6" rx="1" stroke={stroke} strokeWidth="2" />
        <path d="M7 9v3M11 9v3M15 9v3M19 9v3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
