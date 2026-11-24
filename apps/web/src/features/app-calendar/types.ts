export type CalendarSession = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  status: string
  counterpartName: string
  sportType: string | null
  clientId: string | null
  paymentStatus: string | null
}

export type CalendarDayGroup = {
  dateKey: string
  dayLabel: string
  sessions: CalendarSession[]
}

export type CalendarWeekSnapshot = {
  weekLabel: string
  days: CalendarDayGroup[]
}
