import type { Database } from '@/lib/supabase'

export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
export type UserRole = 'owner' | 'admin' | 'member'

export interface OrganizationWithRole {
  organization: Organization
  role: UserRole
}

/**
 * Type guard to check if an object is a valid Organization
 */
export function isValidOrganization(obj: unknown): obj is Organization {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'slug' in obj &&
    'created_at' in obj &&
    'updated_at' in obj &&
    typeof (obj as Organization).id === 'string' &&
    typeof (obj as Organization).name === 'string' &&
    typeof (obj as Organization).slug === 'string'
  )
}

/**
 * Type guard to check if a string is a valid user role
 */
export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && ['owner', 'admin', 'member'].includes(role)
}

/**
 * Safely extract organizations with roles from Supabase query result
 */
export function extractOrganizationsWithRoles(
  memberships: Array<{
    role: string
    organizations: unknown
  }> | null
): OrganizationWithRole[] {
  if (!memberships) return []

  return memberships
    .map(membership => {
      if (
        isValidOrganization(membership.organizations) &&
        isValidUserRole(membership.role)
      ) {
        return {
          organization: membership.organizations,
          role: membership.role
        }
      }
      return null
    })
    .filter((item): item is OrganizationWithRole => item !== null)
}

/**
 * Get organization by ID with type safety
 */
export function findOrganizationById(
  organizations: Organization[],
  orgId: string
): Organization | undefined {
  return organizations.find(org => org.id === orgId)
}

/**
 * Safe localStorage operations for organization context
 */
export const orgStorageKeys = {
  CURRENT_ORG_ID: 'currentOrgId'
} as const

export const orgStorage = {
  getCurrentOrgId(): string | null {
    try {
      return localStorage.getItem(orgStorageKeys.CURRENT_ORG_ID)
    } catch {
      return null
    }
  },

  setCurrentOrgId(orgId: string): void {
    try {
      localStorage.setItem(orgStorageKeys.CURRENT_ORG_ID, orgId)
    } catch (error) {
      console.warn('Failed to save current organization ID:', error)
    }
  },

  clearCurrentOrgId(): void {
    try {
      localStorage.removeItem(orgStorageKeys.CURRENT_ORG_ID)
    } catch (error) {
      console.warn('Failed to clear current organization ID:', error)
    }
  }
}