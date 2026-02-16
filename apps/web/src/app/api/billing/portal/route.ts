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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(org_id)) {
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

    // Get billing info
    const { data: billingInfo, error: billingError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id')
      .eq('org_id', org_id)
      .single()

    if (billingError) {
      console.error('Error fetching billing info:', billingError)
      return NextResponse.json(
        { error: 'No billing information found' },
        { status: 404 }
      )
    }

    if (!billingInfo?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing information found' },
        { status: 404 }
      )
    }

    // Validate required environment variables
    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing NEXT_PUBLIC_SITE_URL environment variable')
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // Create Stripe Customer Portal Session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: billingInfo.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
      })

      if (!session.url) {
        console.error('Stripe portal session created but no URL returned')
        return NextResponse.json(
          { error: 'Failed to create portal session' },
          { status: 500 }
        )
      }

      return NextResponse.json({ url: session.url })
    } catch (stripeError) {
      console.error('Error creating Stripe portal session:', stripeError)
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Unexpected error in portal route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}