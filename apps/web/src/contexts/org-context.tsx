'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { 
  Organization, 
  UserRole, 
  extractOrganizationsWithRoles, 
  findOrganizationById,
  orgStorage 
} from '@/lib/organization-utils'

interface OrganizationContextType {
  user: User | null
  currentOrg: Organization | null
  organizations: Organization[]
  userRole: UserRole | null
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

export function OrganizationProvider({ children, initialUser }: OrganizationProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null)
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefetching, setIsRefetching] = useState(false)

  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const fetchOrganizations = useCallback(async (userId: string, controller?: AbortController) => {
    try {
      setError(null)
      
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (*)
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)
        .abortSignal(controller?.signal)

      if (controller?.signal?.aborted) {
        return
      }

      if (error) {
        console.error('Error fetching organizations:', error)
        setError('Failed to load organizations. Please try again.')
        return
      }

      // Type-safe organization extraction
      const organizationsWithRoles = extractOrganizationsWithRoles(memberships)
      const orgs = organizationsWithRoles.map(item => item.organization)
      setOrganizations(orgs)

      // Set current org from localStorage or first org
      const savedOrgId = orgStorage.getCurrentOrgId()
      let targetOrg = savedOrgId ? findOrganizationById(orgs, savedOrgId) : orgs[0]
      
      if (targetOrg) {
        setCurrentOrg(targetOrg)
        const targetOrgWithRole = organizationsWithRoles.find(
          item => item.organization.id === targetOrg.id
        )
        setUserRole(targetOrgWithRole?.role || null)
        orgStorage.setCurrentOrgId(targetOrg.id)
      } else {
        // Clear any stale data if no organizations found
        setCurrentOrg(null)
        setUserRole(null)
        orgStorage.clearCurrentOrgId()
      }
    } catch (error) {
      if (controller?.signal?.aborted) {
        return
      }
      console.error('Error in fetchOrganizations:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    }
  }, [supabase])

  const switchOrganization = useCallback(async (orgId: string) => {
    const org = findOrganizationById(organizations, orgId)
    if (!org) {
      setError('Organization not found')
      return
    }

    try {
      setError(null)
      setCurrentOrg(org)
      orgStorage.setCurrentOrgId(orgId)
      
      // Fetch user role for the new org
      if (user) {
        const { data, error } = await supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single()

        if (error) {
          console.error('Error fetching user role:', error)
          setError('Failed to load user role for the selected organization')
          return
        }

        setUserRole(data?.role as 'owner' | 'admin' | 'member' || null)
      }
    } catch (error) {
      console.error('Error switching organization:', error)
      setError(error instanceof Error ? error.message : 'Failed to switch organization')
    }
  }, [organizations, user, supabase])

  const refreshOrganizations = useCallback(async () => {
    if (!user || isRefetching) {
      return
    }
    
    try {
      setIsRefetching(true)
      const controller = new AbortController()
      await fetchOrganizations(user.id, controller)
    } finally {
      setIsRefetching(false)
    }
  }, [user, isRefetching, fetchOrganizations])

  useEffect(() => {
    let controller: AbortController | undefined

    const initializeAuth = async () => {
      try {
        controller = new AbortController()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (controller.signal.aborted) return

        if (session?.user) {
          setUser(session.user)
          await fetchOrganizations(session.user.id, controller)
        }
      } catch (error) {
        if (controller?.signal.aborted) return
        console.error('Error initializing auth:', error)
        setError('Failed to initialize authentication')
      } finally {
        if (!controller?.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    const handleAuthStateChange = async (event: string, session: any) => {
      try {
        setError(null)
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          const newController = new AbortController()
          await fetchOrganizations(session.user.id, newController)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setCurrentOrg(null)
          setOrganizations([])
          setUserRole(null)
          setError(null)
          localStorage.removeItem('currentOrgId')
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setError('Authentication state change failed')
      }
    }

    if (!initialUser) {
      initializeAuth()
    } else {
      controller = new AbortController()
      fetchOrganizations(initialUser.id, controller).finally(() => {
        if (!controller?.signal.aborted) {
          setIsLoading(false)
        }
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange)

    return () => {
      controller?.abort()
      subscription.unsubscribe()
    }
  }, [initialUser, supabase, fetchOrganizations])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    currentOrg,
    organizations,
    userRole,
    isLoading: isLoading || isRefetching,
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
    isRefetching,
    error,
    switchOrganization,
    refreshOrganizations,
    clearError
  ])

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}