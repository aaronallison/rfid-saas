import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

// Create service client for server-side operations
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface BillingCustomerResult {
  success: boolean
  customerId?: string
  error?: string
  status?: number
}

/**
 * Get or create Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(
  orgId: string,
  userEmail: string,
  orgName: string
): Promise<BillingCustomerResult> {
  try {
    const supabase = createServiceClient()
    
    // Check if organization already has a Stripe customer
    const { data: billingInfo, error: billingError } = await supabase
      .from('billing_org')
      .select('stripe_customer_id')
      .eq('org_id', orgId)
      .single()

    // If customer exists, return it
    if (!billingError && billingInfo?.stripe_customer_id) {
      return {
        success: true,
        customerId: billingInfo.stripe_customer_id
      }
    }

    // Import Stripe here to avoid loading it if not needed
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    })

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: userEmail,
      name: orgName,
      metadata: {
        org_id: orgId,
      },
    })

    // Update billing info with customer ID
    const { error: upsertError } = await supabase
      .from('billing_org')
      .upsert({
        org_id: orgId,
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Failed to save customer ID:', upsertError)
      return {
        success: false,
        error: 'Failed to save billing information',
        status: 500
      }
    }

    return {
      success: true,
      customerId: customer.id
    }
  } catch (error) {
    console.error('Error creating/retrieving Stripe customer:', error)
    return {
      success: false,
      error: 'Failed to setup billing customer',
      status: 500
    }
  }
}

export interface BillingInfoResult {
  success: boolean
  billingInfo?: {
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    billing_status: string | null
  }
  error?: string
  status?: number
}

/**
 * Get billing information for organization
 */
export async function getOrganizationBillingInfo(orgId: string): Promise<BillingInfoResult> {
  try {
    const supabase = createServiceClient()
    
    const { data: billingInfo, error } = await supabase
      .from('billing_org')
      .select('stripe_customer_id, stripe_subscription_id, billing_status')
      .eq('org_id', orgId)
      .single()

    if (error) {
      // If no billing record exists, it's not necessarily an error
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'No billing information found',
          status: 404
        }
      }
      
      console.error('Error fetching billing info:', error)
      return {
        success: false,
        error: 'Failed to fetch billing information',
        status: 500
      }
    }

    return {
      success: true,
      billingInfo
    }
  } catch (error) {
    console.error('Error in getOrganizationBillingInfo:', error)
    return {
      success: false,
      error: 'Failed to fetch billing information',
      status: 500
    }
  }
}