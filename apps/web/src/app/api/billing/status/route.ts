import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'
import { getBillingInfo, checkFeatureAccess } from '@/lib/billing'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const org_id = searchParams.get('org_id')

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

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get billing information and feature access
    let billingInfo = null
    let featureAccess = null

    try {
      [billingInfo, featureAccess] = await Promise.all([
        getBillingInfo(supabase, org_id),
        checkFeatureAccess(supabase, org_id)
      ])
    } catch (billingError) {
      // If billing info fails, still try to get feature access
      console.error('Error getting billing info:', billingError)
      try {
        featureAccess = await checkFeatureAccess(supabase, org_id)
      } catch (featureError) {
        console.error('Error getting feature access:', featureError)
        // Return restrictive access on error
        featureAccess = {
          canSync: false,
          canExport: false,
          canAddTeamMembers: false,
          maxTeamSize: 0
        }
      }
    }

    return NextResponse.json({
      billing: billingInfo,
      features: featureAccess,
    })

  } catch (error) {
    console.error('Error getting billing status:', error)
    return NextResponse.json(
      { error: 'Failed to get billing status' },
      { status: 500 }
    )
  }
}