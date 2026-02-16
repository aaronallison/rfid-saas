import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { authenticateUser, checkOrgPermission, validateOrgId, createErrorResponse } from '@/lib/auth'
import { PortalRequest, PortalResponse, ApiError } from '@/types/billing'

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
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SITE_URL) {
      console.error('Missing required environment variables for billing portal')
      return createErrorResponse('Billing portal configuration error', 500)
    }

    // Parse and validate request body
    let body: PortalRequest
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

    // Get billing info
    const { data: billingInfo, error: billingError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id, billing_status')
      .eq('org_id', org_id)
      .single()

    if (billingError) {
      console.error('Error fetching billing info:', billingError)
      return createErrorResponse('Failed to fetch billing information', 500)
    }

    if (!billingInfo?.stripe_customer_id) {
      return createErrorResponse('No billing customer found. Please subscribe first.', 404)
    }

    // Verify customer exists in Stripe
    try {
      await stripe.customers.retrieve(billingInfo.stripe_customer_id)
    } catch (stripeError) {
      console.error('Stripe customer not found:', stripeError)
      return createErrorResponse('Billing customer not found in payment system', 404)
    }

    // Create Stripe Customer Portal Session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: billingInfo.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
      })

      if (!session.url) {
        return createErrorResponse('Failed to create portal session', 500)
      }

      return NextResponse.json({ url: session.url } as PortalResponse)
    } catch (stripeError) {
      console.error('Error creating portal session:', stripeError)
      return createErrorResponse('Failed to create portal session', 500)
    }

  } catch (error) {
    console.error('Unexpected error in portal:', error)
    return createErrorResponse('Internal server error', 500)
  }
}