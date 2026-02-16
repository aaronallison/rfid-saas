import Stripe from 'stripe'

// Validate required environment variables
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
}

// Initialize Stripe with proper configuration
export const stripe = new Stripe(requiredEnvVars.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  timeout: 20000, // 20 seconds
})

// Export environment variables for use in components and API routes
export const stripeConfig = {
  publishableKey: requiredEnvVars.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: requiredEnvVars.STRIPE_WEBHOOK_SECRET!,
  priceId: requiredEnvVars.STRIPE_PRICE_ID!,
  siteUrl: requiredEnvVars.SITE_URL!,
} as const

/**
 * Create a Stripe customer
 * @param email Customer email
 * @param name Customer name
 * @param metadata Additional metadata
 * @returns Promise<Stripe.Customer>
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> {
  try {
    return await stripe.customers.create({
      email,
      name,
      metadata,
    })
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw new Error('Failed to create Stripe customer')
  }
}

/**
 * Create a checkout session
 * @param customerId Stripe customer ID
 * @param orgId Organization ID
 * @param userId User ID
 * @returns Promise<Stripe.Checkout.Session>
 */
export async function createCheckoutSession(
  customerId: string,
  orgId: string,
  userId: string
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripeConfig.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${stripeConfig.siteUrl}/billing?success=true`,
      cancel_url: `${stripeConfig.siteUrl}/billing?canceled=true`,
      metadata: {
        org_id: orgId,
        user_id: userId,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax purposes
      billing_address_collection: 'auto',
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

/**
 * Create a billing portal session
 * @param customerId Stripe customer ID
 * @returns Promise<Stripe.BillingPortal.Session>
 */
export async function createBillingPortalSession(
  customerId: string
): Promise<Stripe.BillingPortal.Session> {
  try {
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${stripeConfig.siteUrl}/billing`,
    })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw new Error('Failed to create billing portal session')
  }
}

/**
 * Verify webhook signature and construct event
 * @param body Raw request body
 * @param signature Stripe signature header
 * @returns Stripe.Event
 */
export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, stripeConfig.webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Retrieve a subscription by ID
 * @param subscriptionId Stripe subscription ID
 * @returns Promise<Stripe.Subscription>
 */
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw new Error('Failed to retrieve subscription')
  }
}

/**
 * Map Stripe subscription status to our billing status
 * @param stripeStatus Stripe subscription status
 * @returns Billing status for our database
 */
export function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled'
    default:
      console.warn(`Unknown Stripe subscription status: ${stripeStatus}`)
      return 'canceled'
  }
}

// Export Stripe types for convenience
export type StripeCustomer = Stripe.Customer
export type StripeSubscription = Stripe.Subscription  
export type StripeCheckoutSession = Stripe.Checkout.Session
export type StripeBillingPortalSession = Stripe.BillingPortal.Session
export type StripeEvent = Stripe.Event

export type { Stripe }

// Export the default Stripe instance
export default stripe