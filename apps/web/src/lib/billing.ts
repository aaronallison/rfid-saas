import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase'

export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export interface BillingInfo {
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus | null
  updated_at: string
}

export interface FeatureAccess {
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
}

// Configuration constants
const FEATURE_LIMITS = {
  FREE_TIER: {
    maxTeamSize: 3,
    canSync: false,
    canExport: false,
    canAddTeamMembers: true,
  },
  PRO_TIER: {
    maxTeamSize: 50,
    canSync: true,
    canExport: true,
    canAddTeamMembers: true,
  }
} as const

// Valid billing statuses that grant premium access
const ACTIVE_BILLING_STATUSES: Set<BillingStatus> = new Set(['active', 'trialing'])

/**
 * Check if an organization has active billing status
 * @param supabase - Supabase client instance
 * @param org_id - Organization ID (must be a valid UUID)
 * @returns Promise resolving to boolean indicating if billing is active
 * @throws {Error} If org_id is invalid or database operation fails
 */
export async function checkBillingStatus(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<boolean> {
  // Input validation
  if (!org_id || typeof org_id !== 'string' || org_id.trim().length === 0) {
    throw new Error('Invalid organization ID provided')
  }

  try {
    const { data, error } = await supabase
      .from('billing_org')
      .select('billing_status')
      .eq('org_id', org_id)
      .single()

    if (error) {
      // If no billing record exists, consider it as no active billing
      if (error.code === 'PGRST116') {
        return false
      }
      throw new Error(`Failed to fetch billing status: ${error.message}`)
    }

    // Use the centralized set for status validation
    return data.billing_status ? ACTIVE_BILLING_STATUSES.has(data.billing_status) : false
  } catch (error) {
    // Re-throw validation errors and database errors
    if (error instanceof Error && error.message.includes('Invalid organization ID')) {
      throw error
    }
    console.error('Error in checkBillingStatus:', error)
    throw new Error('Failed to check billing status')
  }
}

/**
 * Get billing information for an organization
 * @param supabase - Supabase client instance
 * @param org_id - Organization ID (must be a valid UUID)
 * @returns Promise resolving to BillingInfo or null if not found
 * @throws {Error} If org_id is invalid or database operation fails
 */
export async function getBillingInfo(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<BillingInfo | null> {
  // Input validation
  if (!org_id || typeof org_id !== 'string' || org_id.trim().length === 0) {
    throw new Error('Invalid organization ID provided')
  }

  try {
    const { data, error } = await supabase
      .from('billing_org')
      .select('*')
      .eq('org_id', org_id)
      .single()

    if (error) {
      // Record not found is expected and not an error case
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch billing info: ${error.message}`)
    }

    return data
  } catch (error) {
    // Re-throw validation errors
    if (error instanceof Error && error.message.includes('Invalid organization ID')) {
      throw error
    }
    console.error('Error in getBillingInfo:', error)
    throw new Error('Failed to retrieve billing information')
  }
}

/**
 * Update or create billing information for an organization
 * @param supabase - Supabase client instance
 * @param org_id - Organization ID (must be a valid UUID)
 * @param billingData - Partial billing data to update (excluding org_id)
 * @returns Promise that resolves when update is complete
 * @throws {Error} If org_id is invalid, billingData is invalid, or database operation fails
 */
export async function updateBillingInfo(
  supabase: SupabaseClient<Database>,
  org_id: string,
  billingData: Partial<Omit<BillingInfo, 'org_id'>>
): Promise<void> {
  // Input validation
  if (!org_id || typeof org_id !== 'string' || org_id.trim().length === 0) {
    throw new Error('Invalid organization ID provided')
  }

  if (!billingData || typeof billingData !== 'object') {
    throw new Error('Invalid billing data provided')
  }

  // Validate billing status if provided
  if (billingData.billing_status !== undefined && billingData.billing_status !== null) {
    const validStatuses: BillingStatus[] = ['trialing', 'active', 'past_due', 'canceled']
    if (!validStatuses.includes(billingData.billing_status)) {
      throw new Error(`Invalid billing status: ${billingData.billing_status}`)
    }
  }

  try {
    const updateData = {
      org_id,
      ...billingData,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('billing_org')
      .upsert(updateData)

    if (error) {
      throw new Error(`Failed to update billing info: ${error.message}`)
    }
  } catch (error) {
    // Re-throw validation errors
    if (error instanceof Error && (
      error.message.includes('Invalid organization ID') ||
      error.message.includes('Invalid billing') ||
      error.message.includes('Invalid billing status')
    )) {
      throw error
    }
    console.error('Error in updateBillingInfo:', error)
    throw new Error('Failed to update billing information')
  }
}

/**
 * Check if organization can perform premium features based on billing status
 * Gates: sync, export, team size
 * @param supabase - Supabase client instance
 * @param org_id - Organization ID (must be a valid UUID)
 * @returns Promise resolving to FeatureAccess object with allowed features
 * @throws {Error} If org_id is invalid or billing check fails
 */
export async function checkFeatureAccess(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<FeatureAccess> {
  // Input validation is handled by checkBillingStatus
  let hasActiveBilling: boolean

  try {
    hasActiveBilling = await checkBillingStatus(supabase, org_id)
  } catch (error) {
    // If billing check fails, default to free tier for safety
    console.error('Failed to check billing status, defaulting to free tier:', error)
    hasActiveBilling = false
  }

  if (hasActiveBilling) {
    return {
      canSync: FEATURE_LIMITS.PRO_TIER.canSync,
      canExport: FEATURE_LIMITS.PRO_TIER.canExport,
      canAddTeamMembers: FEATURE_LIMITS.PRO_TIER.canAddTeamMembers,
      maxTeamSize: FEATURE_LIMITS.PRO_TIER.maxTeamSize
    }
  }

  // Free tier limits
  return {
    canSync: FEATURE_LIMITS.FREE_TIER.canSync,
    canExport: FEATURE_LIMITS.FREE_TIER.canExport,
    canAddTeamMembers: FEATURE_LIMITS.FREE_TIER.canAddTeamMembers,
    maxTeamSize: FEATURE_LIMITS.FREE_TIER.maxTeamSize
  }
}

/**
 * Utility function to map Stripe subscription statuses to our billing statuses
 * Used by webhook handlers to maintain consistency
 * @param stripeStatus - Stripe subscription status
 * @returns Mapped billing status
 */
export function mapStripeStatusToBillingStatus(stripeStatus: string): BillingStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
      return 'canceled'
    default:
      console.warn(`Unknown Stripe status: ${stripeStatus}, defaulting to canceled`)
      return 'canceled'
  }
}

/**
 * Check if a specific feature is available for an organization
 * More efficient than fetching all feature access when only checking one feature
 * @param supabase - Supabase client instance
 * @param org_id - Organization ID
 * @param feature - Feature to check ('sync' | 'export' | 'teamMembers')
 * @returns Promise resolving to boolean indicating feature availability
 */
export async function isFeatureAvailable(
  supabase: SupabaseClient<Database>,
  org_id: string,
  feature: 'sync' | 'export' | 'teamMembers'
): Promise<boolean> {
  try {
    const hasActiveBilling = await checkBillingStatus(supabase, org_id)
    
    switch (feature) {
      case 'sync':
        return hasActiveBilling ? FEATURE_LIMITS.PRO_TIER.canSync : FEATURE_LIMITS.FREE_TIER.canSync
      case 'export':
        return hasActiveBilling ? FEATURE_LIMITS.PRO_TIER.canExport : FEATURE_LIMITS.FREE_TIER.canExport
      case 'teamMembers':
        return hasActiveBilling ? FEATURE_LIMITS.PRO_TIER.canAddTeamMembers : FEATURE_LIMITS.FREE_TIER.canAddTeamMembers
      default:
        throw new Error(`Unknown feature: ${feature}`)
    }
  } catch (error) {
    console.error(`Error checking feature availability for ${feature}:`, error)
    // Default to free tier permissions for safety
    switch (feature) {
      case 'sync':
        return FEATURE_LIMITS.FREE_TIER.canSync
      case 'export':
        return FEATURE_LIMITS.FREE_TIER.canExport
      case 'teamMembers':
        return FEATURE_LIMITS.FREE_TIER.canAddTeamMembers
      default:
        return false
    }
  }
}