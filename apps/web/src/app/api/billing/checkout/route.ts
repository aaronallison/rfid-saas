import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { authenticateUser, checkOrgPermission, validateOrgId, createErrorResponse } from '@/lib/auth'
import { CheckoutRequest, CheckoutResponse, ApiError } from '@/types/billing'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID || !process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing required environment variables for billing')
      return createErrorResponse('Billing service configuration error', 500)
    }

    // Parse and validate request body
    let body: CheckoutRequest
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (!validateOrgId(body.org_id)) {
      return createErrorResponse('Valid organization ID is required', 400)
    }

    const org_id = body.org_id

    // Authenticate user
    const authResult = await authenticateUser(request)
    if ('error' in authResult) {
      return createErrorResponse(authResult.error, authResult.status)
    }

    // Check organization permissions
    const permissionResult = await checkOrgPermission(authResult.user_id, org_id, ['owner', 'admin'])
    if (!permissionResult.hasPermission) {
      return createErrorResponse(permissionResult.error || 'Insufficient permissions', 403)
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      console.error('Organization not found:', orgError)
      return createErrorResponse('Organization not found', 404)
    }

    // Check if organization already has a Stripe customer
    const { data: billingInfo, error: billingError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id, billing_status')
      .eq('org_id', org_id)
      .single()

    // Check if already has active subscription
    if (billingInfo?.billing_status === 'active') {
      return createErrorResponse('Organization already has an active subscription', 400)
    }

    let customerId = billingInfo?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: authResult.email,
          name: org.name,
          metadata: {
            org_id: org_id,
            user_id: authResult.user_id,
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
          console.error('Error updating billing info:', upsertError)
          return createErrorResponse('Failed to update billing information', 500)
        }
      } catch (stripeError) {
        console.error('Error creating Stripe customer:', stripeError)
        return createErrorResponse('Failed to create billing customer', 500)
      }
    }

    // Create Stripe Checkout Session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
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
          user_id: authResult.user_id,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        tax_id_collection: {
          enabled: true,
        },
      })

      if (!session.url) {
        return createErrorResponse('Failed to create checkout session', 500)
      }

      return NextResponse.json({ url: session.url } as CheckoutResponse)
    } catch (stripeError) {
      console.error('Error creating checkout session:', stripeError)
      return createErrorResponse('Failed to create checkout session', 500)
    }

  } catch (error) {
    console.error('Unexpected error in checkout:', error)
    return createErrorResponse('Internal server error', 500)
  }
}