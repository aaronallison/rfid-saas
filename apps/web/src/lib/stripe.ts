import Stripe from 'stripe'

// Centralized Stripe configuration
const STRIPE_CONFIG = {
  apiVersion: '2024-06-20' as const,
  typescript: true,
}

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG)

// Stripe webhook secret
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

// Stripe price ID for subscriptions
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!

// Site URL for redirects
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(params: {
  email: string
  name: string
  orgId: string
  userId: string
}): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      org_id: params.orgId,
      user_id: params.userId,
    },
  })
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(params: {
  customerId: string
  orgId: string
  userId: string
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${SITE_URL}/billing?success=true`,
    cancel_url: `${SITE_URL}/billing?canceled=true`,
    metadata: {
      org_id: params.orgId,
      user_id: params.userId,
    },
  })
}

/**
 * Create a billing portal session
 */
export async function createPortalSession(params: {
  customerId: string
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: `${SITE_URL}/billing`,
  })
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
}

/**
 * Map Stripe subscription status to our billing status
 */
export function mapSubscriptionStatus(status: string): string {
  switch (status) {
    case 'incomplete':
    case 'incomplete_expired':
      return 'canceled'
    case 'unpaid':
      return 'past_due'
    default:
      return status
  }
}