import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe'
import { getBillingOrg, updateBillingOrg } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Get or create billing organization
    let org = await getBillingOrg(orgId)
    let customerId: string | undefined

    if (org?.stripeCustomerId) {
      customerId = org.stripeCustomerId
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        metadata: {
          orgId,
        },
      })
      customerId = customer.id

      // Update organization with customer ID
      await updateBillingOrg(orgId, {
        stripeCustomerId: customerId,
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/billing?canceled=true`,
      metadata: {
        orgId,
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}