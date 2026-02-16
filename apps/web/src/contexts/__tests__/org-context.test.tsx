import { renderHook, act, waitFor } from '@testing-library/react'
import { User } from '@supabase/supabase-js'
import { OrganizationProvider, useOrganization } from '../org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn(),
    abortSignal: jest.fn().mockReturnThis(),
  })),
}

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
}

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Test Organization 1',
    slug: 'test-org-1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'org-2', 
    name: 'Test Organization 2',
    slug: 'test-org-2',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }
]

const mockMemberships = [
  {
    role: 'owner',
    organizations: mockOrganizations[0]
  },
  {
    role: 'admin', 
    organizations: mockOrganizations[1]
  }
]

beforeEach(() => {
  ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabase)
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(), 
    not: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'owner' }, error: null }),
    abortSignal: jest.fn().mockReturnThis(),
  })
  
  // Mock successful organization fetch
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockResolvedValue({
      data: mockMemberships,
      error: null
    }),
  }
  mockSupabase.from.mockReturnValue(mockQuery)
  
  // Clear localStorage
  Storage.prototype.getItem = jest.fn()
  Storage.prototype.setItem = jest.fn()
  Storage.prototype.removeItem = jest.fn()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('OrganizationContext', () => {
  it('should initialize with loading state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.currentOrg).toBeNull()
    expect(result.current.organizations).toEqual([])
    expect(result.current.userRole).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should initialize with initial user', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider initialUser={mockUser}>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    expect(result.current.user).toEqual(mockUser)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.organizations).toEqual(mockOrganizations)
    expect(result.current.currentOrg).toEqual(mockOrganizations[0])
    expect(result.current.userRole).toBe('owner')
  })

  it('should handle organization switching', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider initialUser={mockUser}>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Switch to second organization
    await act(async () => {
      await result.current.switchOrganization('org-2')
    })

    expect(result.current.currentOrg).toEqual(mockOrganizations[1])
    expect(localStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-2')
  })

  it('should handle errors gracefully', async () => {
    // Mock error response
    const mockQueryWithError = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      abortSignal: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      }),
    }
    mockSupabase.from.mockReturnValue(mockQueryWithError)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider initialUser={mockUser}>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load organizations. Please try again.')
  })

  it('should clear error when clearError is called', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    // Simulate error state
    await act(async () => {
      await result.current.switchOrganization('invalid-org-id')
    })

    expect(result.current.error).toBe('Organization not found')

    // Clear error
    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should handle auth state changes', async () => {
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Simulate signed out event
      setTimeout(() => callback('SIGNED_OUT', null), 100)
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OrganizationProvider initialUser={mockUser}>{children}</OrganizationProvider>
    )

    const { result } = renderHook(() => useOrganization(), { wrapper })

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.currentOrg).toBeNull()
      expect(result.current.organizations).toEqual([])
      expect(result.current.userRole).toBeNull()
    })

    expect(localStorage.removeItem).toHaveBeenCalledWith('currentOrgId')
  })

  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useOrganization())
    }).toThrow('useOrganization must be used within an OrganizationProvider')
  })
})