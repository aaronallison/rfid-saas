import { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase'
import { ReactNode } from 'react'

// Database table row types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row']

// Organization context types
export interface OrganizationContextType {
  user: User | null
  currentOrg: Organization | null
  organizations: Organization[]
  userRole: string | null
  isLoading: boolean
  switchOrganization: (orgId: string) => void
  refreshOrganizations: () => Promise<void>
  setUser: (user: User | null) => void
}

// Provider props types
export interface OrganizationProviderProps {
  children: ReactNode
  initialUser?: User | null
}

// Membership with organization data (for complex queries)
export interface MembershipWithOrganization {
  role: string
  organizations: Organization
}