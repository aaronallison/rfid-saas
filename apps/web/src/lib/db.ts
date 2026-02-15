import { createBrowserSupabaseClient, createServerSupabaseClient } from './supabase'
import type { Database } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Enhanced error types
export class DatabaseError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, public fields: string[]) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

// Pagination types
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalCount?: number
    hasNextPage?: boolean
  }
}

// Type aliases for convenience
type Tables = Database['public']['Tables']
type Organization = Tables['organizations']['Row']
type OrganizationInsert = Tables['organizations']['Insert']
type OrganizationUpdate = Tables['organizations']['Update']
type OrganizationMember = Tables['organization_members']['Row']
type OrganizationMemberInsert = Tables['organization_members']['Insert']
type Batch = Tables['batches']['Row']
type BatchInsert = Tables['batches']['Insert']
type BatchUpdate = Tables['batches']['Update']
type Capture = Tables['captures']['Row']
type CaptureInsert = Tables['captures']['Insert']
type BillingOrg = Tables['billing_org']['Row']
type BillingOrgUpdate = Tables['billing_org']['Update']

// Extended types with computed fields
export type BatchWithCounts = Batch & {
  capture_count?: number
  organization?: Organization
}

export type OrganizationWithMembers = Organization & {
  member_count?: number
  members?: OrganizationMember[]
}

// Database service class
export class DatabaseService {
  private client: SupabaseClient<Database>

  constructor(client?: SupabaseClient<Database>) {
    this.client = client || createBrowserSupabaseClient()
  }

  // Static factory methods for different contexts
  static browser() {
    return new DatabaseService(createBrowserSupabaseClient())
  }

  static server(cookies: () => { get: (name: string) => { name: string; value: string } | undefined }) {
    return new DatabaseService(createServerSupabaseClient(cookies))
  }

  // Organization operations
  async getOrganizations(userId: string): Promise<{ data: Organization[] | null; error: Error | null }> {
    try {
      const { data: memberships, error } = await this.client
        .from('organization_members')
        .select(`
          role,
          organizations (*)
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      const organizations = memberships?.map((m: any) => m.organizations).filter(Boolean) || []
      return { data: organizations, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getOrganization(orgId: string): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createOrganization(org: OrganizationInsert): Promise<{ data: Organization | null; error: Error | null }> {
    // Validate input
    const validationErrors = this.validateOrganizationInput(org)
    if (validationErrors.length > 0) {
      return { data: null, error: new Error(`Validation failed: ${validationErrors.join(', ')}`) }
    }

    try {
      const { data, error } = await this.client
        .from('organizations')
        .insert({
          ...org,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateOrganization(orgId: string, updates: OrganizationUpdate): Promise<{ data: Organization | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId)
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getUserRole(userId: string, orgId: string): Promise<{ data: string | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data: data.role, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // Batch operations
  async getBatches(organizationId: string): Promise<{ data: BatchWithCounts[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('batches')
        .select(`
          *,
          captures (count)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      const batchesWithCounts: BatchWithCounts[] = data?.map(batch => ({
        ...batch,
        capture_count: batch.captures?.[0]?.count || 0
      })) || []

      return { data: batchesWithCounts, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async getBatch(batchId: string): Promise<{ data: BatchWithCounts | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('batches')
        .select(`
          *,
          captures (count),
          organizations (*)
        `)
        .eq('id', batchId)
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      const batchWithCounts: BatchWithCounts = {
        ...data,
        capture_count: data.captures?.[0]?.count || 0,
        organization: data.organizations || undefined
      }

      return { data: batchWithCounts, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createBatch(batch: BatchInsert): Promise<{ data: Batch | null; error: Error | null }> {
    // Validate input
    const validationErrors = this.validateBatchInput(batch)
    if (validationErrors.length > 0) {
      return { data: null, error: new ValidationError('Validation failed', validationErrors) }
    }

    try {
      const { data, error } = await this.client
        .from('batches')
        .insert({
          ...batch,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateBatch(batchId: string, updates: BatchUpdate): Promise<{ data: Batch | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('batches')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteBatch(batchId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.client
        .from('batches')
        .delete()
        .eq('id', batchId)

      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Capture operations
  async getCaptures(batchId: string, pagination?: PaginationParams): Promise<{ data: PaginatedResponse<Capture> | null; error: DatabaseError | null }> {
    try {
      const page = pagination?.page || 1
      const pageSize = pagination?.pageSize || 50
      const { from, to } = this.buildPagination(page, pageSize)

      // Get total count
      const { count } = await this.client
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)

      // Get paginated data
      const { data, error } = await this.client
        .from('captures')
        .select('*')
        .eq('batch_id', batchId)
        .order('captured_at', { ascending: false })
        .range(from, to)

      if (error) {
        return { data: null, error: new DatabaseError(error.message, error.code, error.details) }
      }

      const response: PaginatedResponse<Capture> = {
        data: data || [],
        pagination: {
          page,
          pageSize,
          totalCount: count || 0,
          hasNextPage: (count || 0) > to + 1
        }
      }

      return { data: response, error: null }
    } catch (error) {
      return { data: null, error: error as DatabaseError }
    }
  }

  async createCapture(capture: CaptureInsert): Promise<{ data: Capture | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('captures')
        .insert(capture)
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createCapturesBatch(captures: CaptureInsert[]): Promise<{ data: Capture[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('captures')
        .insert(captures)
        .select()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // Billing operations
  async getBillingInfo(orgId: string): Promise<{ data: BillingOrg | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('billing_org')
        .select('*')
        .eq('org_id', orgId)
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateBillingInfo(orgId: string, updates: BillingOrgUpdate): Promise<{ data: BillingOrg | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('billing_org')
        .upsert({
          org_id: orgId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  // Organization member operations
  async getOrganizationMembers(orgId: string): Promise<{ data: OrganizationMember[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async addOrganizationMember(member: OrganizationMemberInsert): Promise<{ data: OrganizationMember | null; error: Error | null }> {
    try {
      const { data, error } = await this.client
        .from('organization_members')
        .insert(member)
        .select()
        .single()

      if (error) {
        return { data: null, error: new Error(error.message) }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async removeOrganizationMember(memberId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.client
        .from('organization_members')
        .delete()
        .eq('id', memberId)

      if (error) {
        return { error: new Error(error.message) }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  // Pagination helper
  private buildPagination(page: number = 1, pageSize: number = 50) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    return { from, to }
  }

  // Utility methods
  async healthCheck(): Promise<{ healthy: boolean; error?: Error }> {
    try {
      const { data, error } = await this.client
        .from('organizations')
        .select('id')
        .limit(1)

      if (error) {
        return { healthy: false, error: new Error(error.message) }
      }

      return { healthy: true }
    } catch (error) {
      return { healthy: false, error: error as Error }
    }
  }

  // Input validation helpers
  private validateBatchInput(batch: BatchInsert): string[] {
    const errors: string[] = []
    
    if (!batch.name || batch.name.trim().length === 0) {
      errors.push('Batch name is required')
    }
    
    if (batch.name && batch.name.length > 255) {
      errors.push('Batch name must be less than 255 characters')
    }
    
    if (!batch.organization_id) {
      errors.push('Organization ID is required')
    }
    
    if (!batch.created_by) {
      errors.push('Created by user ID is required')
    }
    
    return errors
  }

  private validateOrganizationInput(org: OrganizationInsert): string[] {
    const errors: string[] = []
    
    if (!org.name || org.name.trim().length === 0) {
      errors.push('Organization name is required')
    }
    
    if (!org.slug || org.slug.trim().length === 0) {
      errors.push('Organization slug is required')
    }
    
    // Basic slug validation
    if (org.slug && !/^[a-z0-9-]+$/.test(org.slug)) {
      errors.push('Organization slug must contain only lowercase letters, numbers, and hyphens')
    }
    
    return errors
  }
}

// Export convenient factory functions
export const db = DatabaseService.browser()

export function createServerDatabaseService(cookies: () => { get: (name: string) => { name: string; value: string } | undefined }) {
  return DatabaseService.server(cookies)
}

// Export types for consumers
export type {
  Organization,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationMember,
  OrganizationMemberInsert,
  Batch,
  BatchInsert,
  BatchUpdate,
  BatchWithCounts,
  Capture,
  CaptureInsert,
  BillingOrg,
  BillingOrgUpdate,
  OrganizationWithMembers
}