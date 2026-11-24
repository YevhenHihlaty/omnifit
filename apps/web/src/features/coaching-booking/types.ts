/** Sprint 9 coaching booking domain types (OmniFit). */

export type BookingRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"

export type BookingRequestSummary = {
  requestId: string
  coachId: string
  clientId: string
  sportType: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  status: BookingRequestStatus
  clientNote: string | null
  declineReason: string | null
  sessionId: string | null
  counterpartName: string
  createdAt: string
}

export type BookingRequestRow = {
  id: string
  coach_id: string
  client_id: string
  sport_type: string
  starts_at: string
  ends_at: string
  duration_minutes: number
  status: string
  client_note: string | null
  decline_reason: string | null
  session_id: string | null
  created_at: string
  client?: { display_name: string | null; email?: string | null } | null
  coach?: { display_name: string | null; email?: string | null } | null
}

export type SessionPaymentStatus =
  | "not_required"
  | "awaiting_payment"
  | "direct"
  | "paid"
  | "paid_offline"
  | "refunded"
  | "overdue"
  | "pending"
