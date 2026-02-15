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
      throw error
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
}> {
  const hasActiveBilling = await checkBillingStatus(supabase, org_id)

  if (hasActiveBilling) {
    return {
      canSync: true,
      canExport: true,
      canAddTeamMembers: true,
      maxTeamSize: 50 // Premium limit
    }
  }

  // Free tier limits
  return {
    canSync: false,
    canExport: false,
    canAddTeamMembers: true,
    maxTeamSize: 3 // Free tier limit
  }
}