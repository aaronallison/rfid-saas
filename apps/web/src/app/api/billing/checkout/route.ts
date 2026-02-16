import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { validateUserAccess, isValidUUID } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { org_id } = await request.json()

    if (!org_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    if (!isValidUUID(org_id)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format' },
        { status: 400 }
      )
    }

    // Validate user access
    const authResult = await validateUserAccess(request, org_id)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      console.error('Organization query error:', orgError)
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization already has a Stripe customer
    const { data: billingInfo, error: billingQueryError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id')
      .eq('org_id', org_id)
      .single()

    // Log billing query errors but don't fail (record might not exist yet)
    if (billingQueryError && billingQueryError.code !== 'PGRST116') {
      console.error('Billing info query error:', billingQueryError)
    }

    let customerId = billingInfo?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: org.name,
          metadata: {
            org_id: org_id,
            user_id: user.id,
          },
        })
        customerId = customer.id

        // Update billing info with customer ID
        const { error: upsertError } = await supabase
          .from('billing_org')
          .upsert({
            org_id: org_id,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })

        if (upsertError) {
          console.error('Error upserting billing info:', upsertError)
          throw upsertError
        }
      } catch (stripeError) {
        console.error('Error creating Stripe customer:', stripeError)
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        )
      }
    }

    // Validate required environment variables
    if (!process.env.STRIPE_PRICE_ID) {
      console.error('Missing STRIPE_PRICE_ID environment variable')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing NEXT_PUBLIC_SITE_URL environment variable')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // Create Stripe Checkout Session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing?canceled=true`,
        metadata: {
          org_id: org_id,
          user_id: user.id,
        },
      })

      if (!session.url) {
        console.error('Stripe session created but no URL returned')
        return NextResponse.json(
          { error: 'Failed to create checkout session' },
          { status: 500 }
        )
      }

      return NextResponse.json({ url: session.url })
    } catch (stripeError) {
      console.error('Error creating Stripe checkout session:', stripeError)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Unexpected error in checkout route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}