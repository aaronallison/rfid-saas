import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { updateBillingOrg } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        
        if (!orgId) {
          console.error('No orgId in session metadata')
          break
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        
        await updateBillingOrg(orgId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          features: {
            sync: true,
            export: true,
            unlimitedTeamSize: false, // Basic plan features
          },
        })
        
        console.log(`Subscription created for org ${orgId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if (customer.deleted) {
          console.error('Customer was deleted')
          break
        }

        const orgId = customer.metadata?.orgId
        
        if (!orgId) {
          console.error('No orgId in customer metadata')
          break
        }

        await updateBillingOrg(orgId, {
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          features: {
            sync: subscription.status === 'active',
            export: subscription.status === 'active',
            unlimitedTeamSize: false,
          },
        })
        
        console.log(`Subscription updated for org ${orgId}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if (customer.deleted) {
          console.error('Customer was deleted')
          break
        }

        const orgId = customer.metadata?.orgId
        
        if (!orgId) {
          console.error('No orgId in customer metadata')
          break
        }

        await updateBillingOrg(orgId, {
          subscriptionStatus: 'canceled',
          features: {
            sync: false,
            export: false,
            unlimitedTeamSize: false,
          },
        })
        
        console.log(`Subscription canceled for org ${orgId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}