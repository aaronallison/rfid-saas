import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

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
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          org_id: org_id,
          user_id: user.id,
        },
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
        user_id: user.id,
      },
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