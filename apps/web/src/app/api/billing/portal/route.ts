import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getBillingOrg } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json()

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const org = await getBillingOrg(orgId)
    
    if (!org?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing customer found for this organization' },
        { status: 404 }
      )
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${request.nextUrl.origin}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}