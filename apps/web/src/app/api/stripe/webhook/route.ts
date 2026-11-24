import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe/client"
import { processStripeEvent } from "@/features/payments/webhook-handlers"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: "webhook_unconfigured" }, { status: 503 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 })
  }

  const rawBody = await request.text()
  let event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  try {
    const result = await processStripeEvent(event)
    if (!result.handled) {
      // Fail closed for events we claimed but could not apply
      return NextResponse.json({ error: result.reason }, { status: 500 })
    }
    return NextResponse.json({ ok: true, kind: result.kind })
  } catch {
    return NextResponse.json({ error: "handler_failed" }, { status: 500 })
  }
}
