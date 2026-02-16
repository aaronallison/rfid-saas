import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { createBillingPortalSession } from '@/lib/stripe'

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

    if (userError || !user) {
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

    // Get billing info
    const { data: billingInfo, error: billingError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id, billing_status')
      .eq('org_id', org_id)
      .single()

    if (billingError) {
      console.error('Error fetching billing info:', billingError)
      return NextResponse.json(
        { error: 'Unable to fetch billing information' },
        { status: 500 }
      )
    }

    if (!billingInfo?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing information found. Please set up billing first.' },
        { status: 404 }
      )
    }

    // Only allow portal access if there's an active or past subscription
    if (!billingInfo.billing_status || billingInfo.billing_status === 'canceled') {
      return NextResponse.json(
        { error: 'No subscription found. Please create a subscription first.' },
        { status: 404 }
      )
    }

    // Create Stripe Customer Portal Session
    const session = await createBillingPortalSession(billingInfo.stripe_customer_id)

    return NextResponse.json({ 
      url: session.url,
      session_id: session.id 
    })

  } catch (error) {
    console.error('Error in billing portal API:', error)
    
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
          { error: 'Billing service temporarily unavailable' },
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