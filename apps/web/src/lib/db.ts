import { createBrowserSupabaseClient, createServerSupabaseClient, Database } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Database helper functions for consistent data operations

/**
 * Get user's organizations with role information
 */
export async function getUserOrganizations(supabase: SupabaseClient<Database>, userId: string) {
  if (!userId) {
    throw new Error('User ID is required')
  }
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      joined_at,
      organizations!inner (
        id,
        name,
        slug,
        created_at
      )
    `)
    .eq('user_id', userId)
    .not('joined_at', 'is', null) // Only joined members
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user organizations: ${error.message}`)
  }

  return data?.map(member => ({
    id: member.organizations.id,
    name: member.organizations.name,
    slug: member.organizations.slug,
    created_at: member.organizations.created_at,
    role: member.role,
    membership_id: member.id,
    joined_at: member.joined_at
  })) || []
}

/**
 * Get organization batches with basic stats
 */
export async function getOrganizationBatches(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  limit: number = 50
) {
  if (!organizationId) {
    throw new Error('Organization ID is required')
  }

  if (limit <= 0 || limit > 1000) {
    throw new Error('Limit must be between 1 and 1000')
  }
  const { data, error } = await supabase
    .from('batches')
    .select(`
      id,
      name,
      description,
      status,
      created_at,
      created_by
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch organization batches: ${error.message}`)
  }

  return data || []
}

/**
 * Get batch with capture count
 */
export async function getBatchWithStats(
  supabase: SupabaseClient<Database>,
  batchId: string,
  organizationId: string
) {
  if (!batchId || !organizationId) {
    throw new Error('Batch ID and Organization ID are required')
  }
  // Use a more efficient approach with parallel queries
  const [batchResult, captureCountResult] = await Promise.all([
    supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single(),
    
    supabase
      .from('captures')
      .select('id', { count: 'exact', head: true })
      .eq('batch_id', batchId)
  ])

  const { data: batch, error: batchError } = batchResult
  const { count, error: countError } = captureCountResult

  if (batchError) {
    throw new Error(`Failed to fetch batch: ${batchError.message}`)
  }

  if (countError) {
    throw new Error(`Failed to fetch capture count: ${countError.message}`)
  }

  return {
    ...batch,
    capture_count: count || 0
  }
}

/**
 * Get batch captures with pagination
 */
export async function getBatchCaptures(
  supabase: SupabaseClient<Database>,
  batchId: string,
  page: number = 0,
  limit: number = 50
) {
  const from = page * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('captures')
    .select('*', { count: 'exact' })
    .eq('batch_id', batchId)
    .order('captured_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Failed to fetch batch captures: ${error.message}`)
  }

  return {
    data: data || [],
    count: count || 0,
    hasMore: (count || 0) > to + 1
  }
}

/**
 * Create a new batch
 */
export async function createBatch(
  supabase: SupabaseClient<Database>,
  batch: {
    name: string
    description?: string
    organization_id: string
    created_by: string
  }
) {
  if (!batch.name?.trim()) {
    throw new Error('Batch name is required')
  }

  if (!batch.organization_id || !batch.created_by) {
    throw new Error('Organization ID and created_by are required')
  }
  const { data, error } = await supabase
    .from('batches')
    .insert([{
      name: batch.name,
      description: batch.description,
      organization_id: batch.organization_id,
      created_by: batch.created_by,
      status: 'active'
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create batch: ${error.message}`)
  }

  return data
}

/**
 * Update batch status
 */
export async function updateBatchStatus(
  supabase: SupabaseClient<Database>,
  batchId: string,
  organizationId: string,
  status: 'active' | 'completed' | 'archived'
) {
  const { data, error } = await supabase
    .from('batches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update batch status: ${error.message}`)
  }

  return data
}

/**
 * Get organization billing status
 */
export async function getOrganizationBilling(
  supabase: SupabaseClient<Database>,
  organizationId: string
) {
  const { data, error } = await supabase
    .from('billing_org')
    .select('*')
    .eq('org_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Organization has no billing record yet
    }
    throw new Error(`Failed to fetch billing information: ${error.message}`)
  }

  return data
}

/**
 * Check if user has permission for organization
 */
export async function checkUserOrgPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  organizationId: string,
  requiredRole?: 'owner' | 'admin' | 'member'
) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .not('joined_at', 'is', null) // Only joined members
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { hasPermission: false, role: null }
    }
    throw new Error(`Failed to check user permission: ${error.message}`)
  }

  const hasPermission = requiredRole 
    ? hasRolePermission(data.role, requiredRole)
    : true

  return { hasPermission, role: data.role }
}

/**
 * Helper function to check role hierarchy
 */
function hasRolePermission(
  userRole: 'owner' | 'admin' | 'member',
  requiredRole: 'owner' | 'admin' | 'member'
): boolean {
  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Get recent activity for organization dashboard
 */
export async function getOrganizationActivity(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  limit: number = 10
) {
  if (!organizationId) {
    throw new Error('Organization ID is required')
  }

  if (limit <= 0 || limit > 100) {
    throw new Error('Limit must be between 1 and 100')
  }

  // Use parallel queries for better performance
  const [batchResult, captureResult] = await Promise.all([
    supabase
      .from('batches')
      .select('id, name, created_at, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit),
    
    supabase
      .from('captures')
      .select(`
        id,
        rfid_tag,
        captured_at,
        batches!inner (
          id,
          name,
          organization_id
        )
      `)
      .eq('batches.organization_id', organizationId)
      .order('captured_at', { ascending: false })
      .limit(limit)
  ])

  const { data: recentBatches, error: batchError } = batchResult
  const { data: recentCaptures, error: captureError } = captureResult

  if (batchError) {
    throw new Error(`Failed to fetch recent batches: ${batchError.message}`)
  }

  if (captureError) {
    throw new Error(`Failed to fetch recent captures: ${captureError.message}`)
  }

  return {
    recentBatches: recentBatches || [],
    recentCaptures: recentCaptures || []
  }
}

/**
 * Client-side database helpers (for use in React components)
 */
export const clientDb = {
  getUserOrganizations: (userId: string) => 
    getUserOrganizations(createBrowserSupabaseClient(), userId),
  
  getOrganizationBatches: (organizationId: string, limit?: number) =>
    getOrganizationBatches(createBrowserSupabaseClient(), organizationId, limit),
  
  getBatchWithStats: (batchId: string, organizationId: string) =>
    getBatchWithStats(createBrowserSupabaseClient(), batchId, organizationId),
  
  getBatchCaptures: (batchId: string, page?: number, limit?: number) =>
    getBatchCaptures(createBrowserSupabaseClient(), batchId, page, limit),
  
  createBatch: (batch: Parameters<typeof createBatch>[1]) =>
    createBatch(createBrowserSupabaseClient(), batch),
  
  updateBatchStatus: (batchId: string, organizationId: string, status: Parameters<typeof updateBatchStatus>[3]) =>
    updateBatchStatus(createBrowserSupabaseClient(), batchId, organizationId, status),
  
  getOrganizationBilling: (organizationId: string) =>
    getOrganizationBilling(createBrowserSupabaseClient(), organizationId),
  
  checkUserOrgPermission: (userId: string, organizationId: string, requiredRole?: Parameters<typeof checkUserOrgPermission>[3]) =>
    checkUserOrgPermission(createBrowserSupabaseClient(), userId, organizationId, requiredRole),
  
  getOrganizationActivity: (organizationId: string, limit?: number) =>
    getOrganizationActivity(createBrowserSupabaseClient(), organizationId, limit)
}

/**
 * Server-side database helpers (for use in Server Components and API routes)
 */
export const serverDb = {
  getUserOrganizations: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, userId: string) =>
    getUserOrganizations(createServerSupabaseClient(cookies), userId),
  
  getOrganizationBatches: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, organizationId: string, limit?: number) =>
    getOrganizationBatches(createServerSupabaseClient(cookies), organizationId, limit),
  
  getBatchWithStats: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, batchId: string, organizationId: string) =>
    getBatchWithStats(createServerSupabaseClient(cookies), batchId, organizationId),
  
  getBatchCaptures: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, batchId: string, page?: number, limit?: number) =>
    getBatchCaptures(createServerSupabaseClient(cookies), batchId, page, limit),
  
  createBatch: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, batch: Parameters<typeof createBatch>[1]) =>
    createBatch(createServerSupabaseClient(cookies), batch),
  
  updateBatchStatus: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, batchId: string, organizationId: string, status: Parameters<typeof updateBatchStatus>[3]) =>
    updateBatchStatus(createServerSupabaseClient(cookies), batchId, organizationId, status),
  
  getOrganizationBilling: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, organizationId: string) =>
    getOrganizationBilling(createServerSupabaseClient(cookies), organizationId),
  
  checkUserOrgPermission: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, userId: string, organizationId: string, requiredRole?: Parameters<typeof checkUserOrgPermission>[3]) =>
    checkUserOrgPermission(createServerSupabaseClient(cookies), userId, organizationId, requiredRole),
  
  getOrganizationActivity: (cookies: () => { get: (name: string) => { name: string; value: string } | undefined }, organizationId: string, limit?: number) =>
    getOrganizationActivity(createServerSupabaseClient(cookies), organizationId, limit)
}