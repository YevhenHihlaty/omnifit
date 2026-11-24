import { formatUsdFromCents } from "@omnifit/shared"

export type PaymentReceiptInput = {
  sessionId: string
  coachId: string
  clientId: string
  sessionPriceCents: number
  serviceFeeCents: number
  totalCents: number
}

/** ponytail: Resend not wired — log receipt lines in non-prod until provider ships */
export const sendPaymentReceiptEmails = async (
  input: PaymentReceiptInput
): Promise<{ logged: boolean }> => {
  if (process.env.NODE_ENV === "production") {
    return { logged: false }
  }

  console.info(
    `[payment-receipt] session=${input.sessionId} coach=${input.coachId} client=${input.clientId} ` +
      `session=${formatUsdFromCents(input.sessionPriceCents)} fee=${formatUsdFromCents(input.serviceFeeCents)} ` +
      `total=${formatUsdFromCents(input.totalCents)}`
  )
  return { logged: true }
}

export type AcquisitionInvoiceEmailInput = {
  coachId: string
  invoiceId: string
  amountCents: number
  hostedUrl: string | null
}

export const sendAcquisitionInvoiceEmail = async (
  input: AcquisitionInvoiceEmailInput
): Promise<{ logged: boolean }> => {
  if (process.env.NODE_ENV === "production") {
    return { logged: false }
  }
  console.info(
    `[acquisition-invoice] coach=${input.coachId} invoice=${input.invoiceId} ` +
      `amount=${formatUsdFromCents(input.amountCents)} url=${input.hostedUrl ?? "n/a"}`
  )
  return { logged: true }
}
