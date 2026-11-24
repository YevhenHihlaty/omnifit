import type { AppNotification, NotificationKind } from "./types"
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Check,
  CreditCard,
  MessageSquare,
  X,
} from "lucide-react"
import type { ReactNode } from "react"

type KindVisual = {
  icon: ReactNode
  bg: string
  fg?: string
}

export const notificationKindVisual = (
  kind: NotificationKind,
  meta: Record<string, unknown> = {},
  title = ""
): KindVisual => {
  const status = typeof meta.status === "string" ? meta.status : ""
  const titleLower = title.toLowerCase()

  if (kind === "booking_decision" && status === "declined") {
    return {
      icon: <X className="h-4 w-4" aria-hidden />,
      bg: "bg-blush",
    }
  }

  if (
    (kind === "payment" || kind === "subscription") &&
    titleLower.includes("fail")
  ) {
    return {
      icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
      bg: "bg-blush",
    }
  }

  switch (kind) {
    case "message":
      return {
        icon: <MessageSquare className="h-4 w-4" aria-hidden />,
        bg: "bg-sky",
      }
    case "booking_request":
      return {
        icon: <CalendarDays className="h-4 w-4" aria-hidden />,
        bg: "bg-butter",
      }
    case "booking_decision":
      return {
        icon: <Check className="h-4 w-4" aria-hidden />,
        bg: "bg-sage",
      }
    case "progress_photos":
      return {
        icon: <Camera className="h-4 w-4" aria-hidden />,
        bg: "bg-peach",
      }
    case "payment":
      return {
        icon: <CreditCard className="h-4 w-4" aria-hidden />,
        bg: "bg-sage",
      }
    case "subscription":
      return {
        icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
        bg: "bg-warning-tint",
        fg: "text-warning",
      }
    default:
      return {
        icon: <MessageSquare className="h-4 w-4" aria-hidden />,
        bg: "bg-stone-150",
      }
  }
}

export const notificationDestinationLabel = (
  notification: AppNotification,
  labels: {
    destMessage: string
    destBooking: string
    destCalendar: string
    destClient: string
    destSettings: string
    destGeneric: string
  }
): string | null => {
  if (!notification.href) return null
  const href = notification.href
  if (href.startsWith("/messages")) return labels.destMessage
  if (href.startsWith("/sessions")) return labels.destBooking
  if (href.startsWith("/calendar")) return labels.destCalendar
  if (href.startsWith("/clients")) return labels.destClient
  if (href.startsWith("/settings")) return labels.destSettings
  return labels.destGeneric
}
