import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { authenticateAndAuthorize } from '@/lib/auth-utils'
import { getOrganizationBillingInfo } from '@/lib/billing-utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

interface PortalRequestBody {
  org_id: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing required environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    let body: PortalRequestBody
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

    // Get billing information
    const billingResult = await getOrganizationBillingInfo(org_id)
    
    if (!billingResult.success) {
      return NextResponse.json(
        { error: billingResult.error },
        { status: billingResult.status }
      )
    }

    const { billingInfo } = billingResult

    if (!billingInfo?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing customer found. Please subscribe first.' },
        { status: 404 }
      )
    }

    // Create Stripe Customer Portal Session
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

    return NextResponse.json({ 
      url: session.url,
      customerId: billingInfo.stripe_customer_id,
      billingStatus: billingInfo.billing_status
    })

  } catch (error) {
    console.error('Error creating portal session:', error)
    
    // Don't expose internal error details to client
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment service error' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}