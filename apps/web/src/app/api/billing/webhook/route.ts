import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
      console.error('Missing required environment variables for webhook')
      return NextResponse.json({ error: 'Webhook configuration error' }, { status: 500 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Webhook received without signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const org_id = session.metadata?.org_id
    if (!org_id || !isValidUUID(org_id)) {
      console.error('Invalid or missing org_id in checkout session metadata:', org_id)
      return
    }

    const subscriptionId = session.subscription as string
    const customerId = session.customer as string

    if (!subscriptionId || !customerId) {
      console.error('Missing subscription or customer ID in checkout session')
      return
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const billingStatus = mapStripeToBillingStatus(subscription.status)

    const { error } = await supabase
      .from('billing_org')
      .upsert({
        org_id: org_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        billing_status: billingStatus,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error updating billing info after checkout:', error)
      throw error
    }

    console.log(`Checkout completed for org ${org_id}, subscription ${subscriptionId}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const billingStatus = mapStripeToBillingStatus(subscription.status)

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('No billing info found for customer during subscription creation:', customerId, error)
      return
    }

    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: billingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info after subscription creation:', updateError)
      throw updateError
    }

    console.log(`Subscription created for org ${billingInfo.org_id}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string
    const billingStatus = mapStripeToBillingStatus(subscription.status)

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('No billing info found for customer during subscription update:', customerId, error)
      return
    }

    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: billingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info after subscription update:', updateError)
      throw updateError
    }

    console.log(`Subscription updated for org ${billingInfo.org_id}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('No billing info found for customer during subscription deletion:', customerId, error)
      return
    }

    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        billing_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info after subscription deletion:', updateError)
      throw updateError
    }

    console.log(`Subscription canceled for org ${billingInfo.org_id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    const subscriptionId = invoice.subscription as string

    if (!subscriptionId) {
      console.log('Invoice payment failed but no subscription ID found')
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('No billing info found for customer during payment failure:', customerId, error)
      return
    }

    // Update to past_due status
    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        billing_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info after payment failure:', updateError)
      throw updateError
    }

    console.log(`Payment failed for org ${billingInfo.org_id}, marked as past_due`)
  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const customerId = invoice.customer as string
    const subscriptionId = invoice.subscription as string

    if (!subscriptionId) {
      console.log('Invoice payment succeeded but no subscription ID found')
      return
    }

    // Get current subscription status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const billingStatus = mapStripeToBillingStatus(subscription.status)

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('No billing info found for customer during payment success:', customerId, error)
      return
    }

    // Update billing status based on subscription status
    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        billing_status: billingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info after payment success:', updateError)
      throw updateError
    }

    console.log(`Payment succeeded for org ${billingInfo.org_id}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}

/**
 * Map Stripe subscription status to our billing status
 */
function mapStripeToBillingStatus(stripeStatus: string): BillingStatus {
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
      return 'canceled'
    default:
      console.warn(`Unknown Stripe status: ${stripeStatus}, defaulting to canceled`)
      return 'canceled'
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}