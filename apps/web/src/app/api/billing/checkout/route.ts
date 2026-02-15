import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { createStripeCustomer, createCheckoutSession } from '@/lib/stripe'

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

    // Get the user from the session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Verify user has access to the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if organization already has a Stripe customer
    const { data: billingInfo } = await supabase
      .from('billing_org')
      .select('stripe_customer_id')
      .eq('org_id', org_id)
      .single()

    let customerId = billingInfo?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.email!,
        name: org.name,
        orgId: org_id,
        userId: user.id,
      })
      customerId = customer.id

      // Update billing info with customer ID
      await supabase
        .from('billing_org')
        .upsert({
          org_id: org_id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
    }

    // Create Stripe Checkout Session
    const session = await createCheckoutSession({
      customerId,
      orgId: org_id,
      userId: user.id,
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}