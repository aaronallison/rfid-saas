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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
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
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
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
      console.error('No org_id in checkout session metadata')
      return
    }

    const subscriptionId = session.subscription as string
    const customerId = session.customer as string

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    await supabase
      .from('billing_org')
      .upsert({
        org_id: org_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        billing_status: subscription.status as any,
        updated_at: new Date().toISOString()
      })

    console.log(`Checkout completed for org ${org_id}, subscription ${subscriptionId}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string

    // Find the organization by customer ID
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('org_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !billingInfo) {
      console.error('No billing info found for customer:', customerId)
      return
    }

    let billingStatus: string = subscription.status
    
    // Map Stripe subscription statuses to our billing statuses
    if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
      billingStatus = 'canceled'
    } else if (subscription.status === 'unpaid') {
      billingStatus = 'past_due'
    }

    await supabase
      .from('billing_org')
      .update({
        stripe_subscription_id: subscription.id,
        billing_status: billingStatus as any,
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    console.log(`Subscription updated for org ${billingInfo.org_id}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling subscription updated:', error)
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

    if (error || !billingInfo) {
      console.error('No billing info found for customer:', customerId)
      return
    }

    await supabase
      .from('billing_org')
      .update({
        billing_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('org_id', billingInfo.org_id)

    console.log(`Subscription canceled for org ${billingInfo.org_id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}