import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { createStripeCustomer, createCheckoutSession } from '@/lib/stripe'
import { updateBillingInfo } from '@/lib/billing'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { org_id } = body

    // Validate request body
    if (!org_id || typeof org_id !== 'string') {
      return NextResponse.json(
        { error: 'Valid organization ID is required' },
        { status: 400 }
      )
    }

    // Get the user from the session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication token' },
        { status: 401 }
      )
    }

    // Verify user has access to the organization and proper permissions
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError) {
      console.error('Error fetching membership:', membershipError)
      return NextResponse.json(
        { error: 'Unable to verify organization membership' },
        { status: 500 }
      )
    }

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and admins can manage billing.' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError)
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization already has a Stripe customer
    const { data: billingInfo } = await supabase
      .from('billing_org')
      .select('stripe_customer_id, billing_status')
      .eq('org_id', org_id)
      .single()

    let customerId = billingInfo?.stripe_customer_id

    // Prevent creating multiple subscriptions for already active organizations
    if (billingInfo?.billing_status === 'active' || billingInfo?.billing_status === 'trialing') {
      return NextResponse.json(
        { error: 'Organization already has an active subscription' },
        { status: 409 }
      )
    }

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(
        user.email,
        org.name,
        {
          org_id: org_id,
          user_id: user.id,
        }
      )
      customerId = customer.id

      // Update billing info with customer ID
      await updateBillingInfo(supabase, org_id, {
        stripe_customer_id: customerId,
      })
    }

    // Create Stripe Checkout Session
    const session = await createCheckoutSession(customerId, org_id, user.id)

    return NextResponse.json({ 
      url: session.url,
      session_id: session.id 
    })

  } catch (error) {
    console.error('Error in checkout API:', error)
    
    // Provide more specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('environment variables')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        )
      }
      
      if (error.message.includes('Stripe')) {
        return NextResponse.json(
          { error: 'Payment service temporarily unavailable' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}