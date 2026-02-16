import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { constructWebhookEvent, retrieveSubscription, mapSubscriptionStatus, type StripeEvent } from '@/lib/stripe'
import { updateBillingInfo } from '@/lib/billing'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature in webhook request')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    let event: StripeEvent

    try {
      event = constructWebhookEvent(body, signature)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type} (${event.id})`)

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as any)
          break

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as any)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as any)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as any)
          break

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as any)
          break

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as any)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (handlerError) {
      console.error(`Error handling webhook event ${event.type}:`, handlerError)
      return NextResponse.json(
        { error: 'Event handler failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      received: true,
      event_id: event.id,
      event_type: event.type
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
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
    const subscription = await retrieveSubscription(subscriptionId)
    const billingStatus = mapSubscriptionStatus(subscription.status)

    await updateBillingInfo(supabase, org_id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      billing_status: billingStatus,
    })

    console.log(`Checkout completed for org ${org_id}, subscription ${subscriptionId}, status: ${billingStatus}`)
  } catch (error) {
    console.error('Error handling checkout session completed:', error)
    throw error
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    await handleSubscriptionChange(subscription, 'created')
  } catch (error) {
    console.error('Error handling subscription created:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    await handleSubscriptionChange(subscription, 'updated')
  } catch (error) {
    console.error('Error handling subscription updated:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customerId = subscription.customer as string
    const billingInfo = await findBillingInfoByCustomerId(customerId)
    
    if (!billingInfo) {
      console.error('No billing info found for customer:', customerId)
      return
    }

    await updateBillingInfo(supabase, billingInfo.org_id, {
      billing_status: 'canceled',
    })

    console.log(`Subscription canceled for org ${billingInfo.org_id}`)
  } catch (error) {
    console.error('Error handling subscription deleted:', error)
    throw error
  }
}

async function handlePaymentSucceeded(invoice: any) {
  try {
    const customerId = invoice.customer as string
    const billingInfo = await findBillingInfoByCustomerId(customerId)
    
    if (!billingInfo) {
      console.error('No billing info found for customer:', customerId)
      return
    }

    // If payment succeeded and status was past_due, update to active
    if (billingInfo.billing_status === 'past_due') {
      await updateBillingInfo(supabase, billingInfo.org_id, {
        billing_status: 'active',
      })
      console.log(`Payment succeeded, updated org ${billingInfo.org_id} to active`)
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error)
    throw error
  }
}

async function handlePaymentFailed(invoice: any) {
  try {
    const customerId = invoice.customer as string
    const billingInfo = await findBillingInfoByCustomerId(customerId)
    
    if (!billingInfo) {
      console.error('No billing info found for customer:', customerId)
      return
    }

    // Mark as past due when payment fails
    await updateBillingInfo(supabase, billingInfo.org_id, {
      billing_status: 'past_due',
    })

    console.log(`Payment failed for org ${billingInfo.org_id}, marked as past_due`)
  } catch (error) {
    console.error('Error handling payment failed:', error)
    throw error
  }
}

async function handleSubscriptionChange(subscription: any, changeType: string) {
  const customerId = subscription.customer as string
  const billingInfo = await findBillingInfoByCustomerId(customerId)
  
  if (!billingInfo) {
    console.error(`No billing info found for customer: ${customerId}`)
    return
  }

  const billingStatus = mapSubscriptionStatus(subscription.status)

  await updateBillingInfo(supabase, billingInfo.org_id, {
    stripe_subscription_id: subscription.id,
    billing_status: billingStatus,
  })

  console.log(`Subscription ${changeType} for org ${billingInfo.org_id}, status: ${billingStatus}`)
}

async function findBillingInfoByCustomerId(customerId: string) {
  const { data: billingInfo, error } = await supabase
    .from('billing_org')
    .select('org_id, billing_status')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error) {
    console.error('Error fetching billing info by customer ID:', error)
    return null
  }

  return billingInfo
}