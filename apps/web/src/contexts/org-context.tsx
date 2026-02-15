'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']

interface OrganizationContextType {
  user: User | null
  currentOrg: Organization | null
  organizations: Organization[]
  userRole: string | null
  isLoading: boolean
  switchOrganization: (orgId: string) => void
  refreshOrganizations: () => Promise<void>
  setUser: (user: User | null) => void
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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  const fetchOrganizations = async (userId: string) => {
    try {
      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (*)
        `)
        .eq('user_id', userId)
        .not('joined_at', 'is', null)

      if (error) {
        console.error('Error fetching organizations:', error)
        return
      }

      const orgs = memberships?.map((m: any) => m.organizations).filter(Boolean) || []
      setOrganizations(orgs)

      // Set current org from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrgId')
      let targetOrg = orgs.find((org: Organization) => org.id === savedOrgId) || orgs[0]
      
      if (targetOrg) {
        setCurrentOrg(targetOrg)
        const membership = memberships?.find((m: any) => m.organizations?.id === targetOrg.id)
        setUserRole(membership?.role || null)
        localStorage.setItem('currentOrgId', targetOrg.id)
      }
    } catch (error) {
      console.error('Error in fetchOrganizations:', error)
    }
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrg(org)
      localStorage.setItem('currentOrgId', orgId)
      // Fetch user role for the new org
      if (user) {
        supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .single()
          .then(({ data }) => {
            setUserRole(data?.role || null)
          })
      }
    }
  }

  const refreshOrganizations = async () => {
    if (user) {
      await fetchOrganizations(user.id)
    }
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await fetchOrganizations(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!initialUser) {
      initializeAuth()
    } else {
      fetchOrganizations(initialUser.id).finally(() => setIsLoading(false))
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchOrganizations(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setCurrentOrg(null)
        setOrganizations([])
        setUserRole(null)
        localStorage.removeItem('currentOrgId')
      }
    })

    return () => subscription.unsubscribe()
  }, [initialUser])

  return (
    <OrganizationContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        userRole,
        isLoading,
        switchOrganization,
        refreshOrganizations,
        setUser,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}