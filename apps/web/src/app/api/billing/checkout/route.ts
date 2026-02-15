import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { authenticateAndAuthorize } from '@/lib/auth-utils'
import { getOrCreateStripeCustomer } from '@/lib/billing-utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CheckoutRequestBody {
  org_id: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID || !process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing required environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    let body: CheckoutRequestBody
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { org_id } = body

    if (!org_id || typeof org_id !== 'string') {
      return NextResponse.json(
        { error: 'Organization ID is required and must be a string' },
        { status: 400 }
      )
    }

    // Authenticate user and check organization access
    const authResult = await authenticateAndAuthorize(request, org_id, ['owner', 'admin'])
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { user } = authResult

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      console.error('Organization fetch error:', orgError)
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const customerResult = await getOrCreateStripeCustomer(
      org_id,
      user!.email || '',
      org.name
    )

    if (!customerResult.success) {
      return NextResponse.json(
        { error: customerResult.error },
        { status: customerResult.status }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerResult.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing?canceled=true`,
      metadata: {
        org_id: org_id,
        user_id: user!.id,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Set billing address collection
      billing_address_collection: 'required',
      // Add tax collection if needed
      automatic_tax: {
        enabled: false, // Enable if you have tax calculation setup
      },
    })

    if (!session.url) {
      console.error('Stripe session created but no URL returned')
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id 
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Don't expose internal error details to client
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment service error' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}