'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
type OrganizationMemberWithOrg = OrganizationMember & {
  organizations: Organization
}

interface OrganizationContextType {
  user: User | null
  currentOrg: Organization | null
  organizations: Organization[]
  userRole: string | null
  isLoading: boolean
  error: string | null
  switchOrganization: (orgId: string) => Promise<void>
  refreshOrganizations: () => Promise<void>
  setUser: (user: User | null) => void
  clearError: () => void
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

interface OrganizationProviderProps {
  children: ReactNode
  initialUser?: User | null
}

// Constants
const CURRENT_ORG_KEY = 'currentOrgId'

// Utility functions
const getStoredOrgId = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CURRENT_ORG_KEY)
  } catch {
    return null
  }
}

const storeOrgId = (orgId: string): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CURRENT_ORG_KEY, orgId)
  } catch {
    // Silently fail if localStorage is not available
  }
}

const removeStoredOrgId = (): void => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CURRENT_ORG_KEY)
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function OrganizationProvider({ children, initialUser }: OrganizationProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchUserRole = useCallback(async (userId: string, orgId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        return null
      }

      return data?.role || null
    } catch (error) {
      console.error('Error in fetchUserRole:', error)
      return null
    }
  }, [supabase])

  const fetchOrganizations = useCallback(async (userId: string) => {
    try {
      setError(null)
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (
            id,
            name,
            slug,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error) {
        const errorMessage = 'Failed to fetch organizations'
        setError(errorMessage)
        console.error('Error fetching organizations:', error)
        return
      }

      // Type-safe filtering and mapping
      const validMemberships = (memberships || []).filter((m): m is OrganizationMemberWithOrg => 
        m?.organizations != null
      )
      
      const orgs = validMemberships.map(m => m.organizations)
      setOrganizations(orgs)

      // Set current org from localStorage or first org
      const savedOrgId = getStoredOrgId()
      let targetOrg = orgs.find(org => org.id === savedOrgId) || orgs[0]
      
      if (targetOrg) {
        setCurrentOrg(targetOrg)
        const membership = validMemberships.find(m => m.organizations.id === targetOrg.id)
        setUserRole(membership?.role || null)
        storeOrgId(targetOrg.id)
      } else {
        // Clear stored org ID if no orgs available
        setCurrentOrg(null)
        setUserRole(null)
        removeStoredOrgId()
      }
    } catch (error) {
      const errorMessage = 'Failed to fetch organizations'
      setError(errorMessage)
      console.error('Error in fetchOrganizations:', error)
    }
  }, [supabase])

  const switchOrganization = useCallback(async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (!org || !user) {
      console.error('Organization not found or user not available')
      return
    }

    try {
      setError(null)
      setCurrentOrg(org)
      storeOrgId(orgId)
      
      // Fetch user role for the new org
      const role = await fetchUserRole(user.id, orgId)
      setUserRole(role)
    } catch (error) {
      const errorMessage = 'Failed to switch organization'
      setError(errorMessage)
      console.error('Error switching organization:', error)
    }
  }, [organizations, user, fetchUserRole])

  const refreshOrganizations = useCallback(async () => {
    if (user) {
      await fetchOrganizations(user.id)
    }
  }, [user, fetchOrganizations])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        setError(null)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && mounted) {
          setUser(session.user)
          await fetchOrganizations(session.user.id)
        }
      } catch (error) {
        if (mounted) {
          const errorMessage = 'Failed to initialize authentication'
          setError(errorMessage)
          console.error('Error initializing auth:', error)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    if (!initialUser) {
      initializeAuth()
    } else if (mounted) {
      fetchOrganizations(initialUser.id).finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchOrganizations(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentOrg(null)
        setOrganizations([])
        setUserRole(null)
        setError(null)
        removeStoredOrgId()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [initialUser, fetchOrganizations, supabase.auth])

  const contextValue = useMemo(() => ({
    user,
    currentOrg,
    organizations,
    userRole,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    setUser,
    clearError,
  }), [
    user,
    currentOrg,
    organizations,
    userRole,
    isLoading,
    error,
    switchOrganization,
    refreshOrganizations,
    clearError,
  ])

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}