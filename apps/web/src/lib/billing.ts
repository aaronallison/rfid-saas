import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './supabase'
import { validateOrgId } from './auth'

export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

export interface BillingInfo {
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_status: BillingStatus | null
  updated_at: string
}

/**
 * Check if an organization has active billing status
 * @param supabase Supabase client
 * @param org_id Organization ID
 * @returns boolean indicating if billing is active
 */
export async function checkBillingStatus(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<boolean> {
  if (!validateOrgId(org_id)) {
    console.error('Invalid organization ID provided to checkBillingStatus')
    return false
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
      console.error('Error checking billing status:', error)
      return false
    }

    // Consider trialing and active as valid billing status
    return data.billing_status === 'active' || data.billing_status === 'trialing'
  } catch (error) {
    console.error('Error in checkBillingStatus:', error)
    return false
  }
}

/**
 * Get billing information for an organization
 * @param supabase Supabase client
 * @param org_id Organization ID
 * @returns BillingInfo or null if not found
 */
export async function getBillingInfo(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<BillingInfo | null> {
  if (!validateOrgId(org_id)) {
    console.error('Invalid organization ID provided to getBillingInfo')
    return null
  }

  try {
    const { data, error } = await supabase
      .from('billing_org')
      .select('*')
      .eq('org_id', org_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error getting billing info:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getBillingInfo:', error)
    return null
  }
}

/**
 * Update or create billing information for an organization
 * @param supabase Supabase client
 * @param org_id Organization ID
 * @param billingData Billing data to update
 */
export async function updateBillingInfo(
  supabase: SupabaseClient<Database>,
  org_id: string,
  billingData: Partial<Omit<BillingInfo, 'org_id'>>
): Promise<void> {
  if (!validateOrgId(org_id)) {
    throw new Error('Invalid organization ID provided to updateBillingInfo')
  }

  try {
    const { error } = await supabase
      .from('billing_org')
      .upsert({
        org_id,
        ...billingData,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error updating billing info:', error)
      throw new Error(`Failed to update billing info: ${error.message}`)
    }
  } catch (error) {
    console.error('Error in updateBillingInfo:', error)
    throw error
  }
}

/**
 * Check if organization can perform premium features
 * Gates: sync, export, team size
 * @param supabase Supabase client
 * @param org_id Organization ID
 * @returns object with allowed features
 */
export async function checkFeatureAccess(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<{
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
  billingStatus: BillingStatus | null
}> {
  if (!validateOrgId(org_id)) {
    console.error('Invalid organization ID provided to checkFeatureAccess')
    return {
      canSync: false,
      canExport: false,
      canAddTeamMembers: false,
      maxTeamSize: 0,
      billingStatus: null
    }
  }

  const billingInfo = await getBillingInfo(supabase, org_id)
  const hasActiveBilling = billingInfo?.billing_status === 'active' || billingInfo?.billing_status === 'trialing'

  if (hasActiveBilling) {
    return {
      canSync: true,
      canExport: true,
      canAddTeamMembers: true,
      maxTeamSize: 50, // Premium limit
      billingStatus: billingInfo.billing_status
    }
  }

  // Free tier limits
  return {
    canSync: false,
    canExport: false,
    canAddTeamMembers: true,
    maxTeamSize: 3, // Free tier limit
    billingStatus: billingInfo?.billing_status || null
  }
}

/**
 * Check current team size for an organization
 * @param supabase Supabase client
 * @param org_id Organization ID
 * @returns current team member count
 */
export async function getCurrentTeamSize(
  supabase: SupabaseClient<Database>,
  org_id: string
): Promise<number> {
  if (!validateOrgId(org_id)) {
    console.error('Invalid organization ID provided to getCurrentTeamSize')
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org_id)
      .not('user_id', 'is', null) // Only count actual members, not invites

    if (error) {
      console.error('Error getting team size:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error in getCurrentTeamSize:', error)
    return 0
  }
}