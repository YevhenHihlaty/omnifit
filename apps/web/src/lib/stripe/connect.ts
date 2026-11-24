import { getStripe, appUrl } from "./client"

/**
 * Create (or reuse) a Connect account where Stripe collects processing fees
 * ("Stripe handles pricing") and the platform takes application_fee_amount.
 */
export const ensureConnectAccount = async (input: {
  existingAccountId: string | null
  email: string
  displayName: string
}): Promise<{ accountId: string }> => {
  const stripe = getStripe()
  if (input.existingAccountId) {
    return { accountId: input.existingAccountId }
  }

  const account = await stripe.accounts.create({
    email: input.email || undefined,
    business_profile: {
      name: input.displayName || undefined,
      product_description: "1:1 coaching sessions via OmniFit",
    },
    // Stripe handles pricing: connected account pays Stripe fees; platform takes app fee
    controller: {
      fees: { payer: "account" },
      losses: { payments: "stripe" },
      stripe_dashboard: { type: "express" },
      requirement_collection: "stripe",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      platform: "omnifit",
    },
  })

  return { accountId: account.id }
}

export const createConnectOnboardingLink = async (
  accountId: string
): Promise<{ url: string }> => {
  const stripe = getStripe()
  const base = appUrl()
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/profile/billing?connect=refresh`,
    return_url: `${base}/profile/billing?connect=return`,
    type: "account_onboarding",
  })
  return { url: link.url }
}

export const isConnectChargesReady = async (
  accountId: string
): Promise<boolean> => {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(accountId)
  return account.charges_enabled === true
}
