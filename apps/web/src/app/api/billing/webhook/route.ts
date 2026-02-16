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

// Validate webhook secret exists
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!webhookSecret) {
  console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
  throw new Error('Missing required environment variable: STRIPE_WEBHOOK_SECRET')
}

/**
 * Maps Stripe subscription status to our billing status enum
 */
function mapStripeToBillingStatus(stripeStatus: string): Database['public']['Tables']['billing_org']['Row']['billing_status'] {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled'
    default:
      console.warn(`Unknown Stripe status: ${stripeStatus}, mapping to 'canceled'`)
      return 'canceled'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Webhook received without signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
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

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (handlerError) {
      console.error(`Error handling event ${event.type}:`, handlerError)
      // Still return 200 to acknowledge receipt to Stripe
      // Log the error for investigation but don't fail the webhook
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const org_id = session.metadata?.org_id
    if (!org_id) {
      console.error('No org_id in checkout session metadata:', session.id)
      return
    }

    const subscriptionId = session.subscription as string
    const customerId = session.customer as string

    if (!subscriptionId || !customerId) {
      console.error('Missing subscription or customer ID in checkout session:', session.id)
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
      console.error('Error upserting billing info after checkout:', error)
      throw error
    }

    console.log(`Checkout completed for org ${org_id}, subscription ${subscriptionId}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    if (!customerId) {
      console.error('No customer ID in subscription update:', subscription.id)
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !billingInfo) {
      console.error('No billing info found for customer:', customerId, error)
      return
    }

    const billingStatus = mapStripeToBillingStatus(subscription.status)

    const { error: updateError } = await supabase
      .from('billing_org')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: billingStatus,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    if (updateError) {
      console.error('Error updating billing info:', updateError)
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

    if (!customerId) {
      console.error('No customer ID in subscription deletion:', subscription.id)
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !billingInfo) {
      console.error('No billing info found for customer:', customerId, error)
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
      console.error('Error updating billing status to canceled:', updateError)
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

    if (!customerId) {
      console.error('No customer ID in payment failed event:', invoice.id)
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !billingInfo) {
      console.error('No billing info found for customer:', customerId, error)
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
      console.error('Error updating billing status to past_due:', updateError)
      throw updateError
    }

    console.log(`Payment failed for org ${billingInfo.org_id}, status set to past_due`)
  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}