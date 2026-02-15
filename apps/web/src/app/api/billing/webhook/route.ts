import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

// Validate required environment variables
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
}

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}

const stripe = new Stripe(requiredEnvVars.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
  requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = requiredEnvVars.STRIPE_WEBHOOK_SECRET!

// Helper function to map Stripe subscription statuses to our billing statuses
function mapStripeToBillingStatus(stripeStatus: string): Database['public']['Tables']['billing_org']['Row']['billing_status'] {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'incomplete':
      return 'canceled'
    default:
      console.warn(`Unknown Stripe status: ${stripeStatus}, defaulting to canceled`)
      return 'canceled'
  }
}

export async function POST(request: NextRequest) {
  let event: Stripe.Event | null = null
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Webhook request missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type} (${event.id})`)

    // Handle the event
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

      default:
        console.log(`Unhandled event type: ${event.type} (${event.id})`)
    }

    console.log(`Successfully processed webhook event: ${event.type} (${event.id})`)
    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook handler failed:', error, {
      eventId: event?.id,
      eventType: event?.type
    })
    
    // Return 500 to signal to Stripe that the webhook should be retried
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
      console.error('Missing org_id in checkout session metadata', { sessionId: session.id })
      return
    }

    const subscriptionId = session.subscription as string
    const customerId = session.customer as string

    if (!subscriptionId || !customerId) {
      console.error('Missing subscription or customer ID in checkout session', {
        sessionId: session.id,
        subscriptionId,
        customerId
      })
      return
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    // Map Stripe status to our billing status type
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
      console.error('Database error in checkout completion:', error, { org_id, subscriptionId })
      throw error
    }

    console.log(`Checkout completed for org ${org_id}, subscription ${subscriptionId}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error, {
      sessionId: session.id,
      orgId: session.metadata?.org_id
    })
    throw error // Re-throw to ensure webhook failure is reported
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    if (!customerId) {
      console.error('Missing customer ID in subscription update', { subscriptionId: subscription.id })
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('Database error finding billing info for customer:', error, { customerId })
      return
    }

    if (!billingInfo) {
      console.error('No billing info found for customer:', { customerId, subscriptionId: subscription.id })
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
      console.error('Database error updating subscription:', updateError, {
        orgId: billingInfo.org_id,
        subscriptionId: subscription.id
      })
      throw updateError
    }

    console.log(`Subscription updated for org ${billingInfo.org_id}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error, { subscriptionId: subscription.id })
    throw error // Re-throw to ensure webhook failure is reported
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    if (!customerId) {
      console.error('Missing customer ID in subscription deletion', { subscriptionId: subscription.id })
      return
    }

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error) {
      console.error('Database error finding billing info for customer:', error, { customerId })
      return
    }

    if (!billingInfo) {
      console.error('No billing info found for customer:', { customerId, subscriptionId: subscription.id })
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
      console.error('Database error canceling subscription:', updateError, {
        orgId: billingInfo.org_id,
        subscriptionId: subscription.id
      })
      throw updateError
    }

    console.log(`Subscription canceled for org ${billingInfo.org_id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error, { subscriptionId: subscription.id })
    throw error // Re-throw to ensure webhook failure is reported
  }
}