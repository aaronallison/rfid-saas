import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { User } from '@supabase/supabase-js'
import { OrganizationProvider, useOrganization } from '../org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(),
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleLog = console.log

beforeEach(() => {
  console.error = jest.fn()
  console.log = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
  console.log = originalConsoleLog
})

// Test component to access the context
function TestComponent() {
  const {
    user,
    currentOrg,
    organizations,
    userRole,
    isLoading,
    switchOrganization,
    refreshOrganizations,
    setUser,
  } = useOrganization()

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="user">{user?.id || 'null'}</div>
      <div data-testid="current-org">{currentOrg?.name || 'null'}</div>
      <div data-testid="organizations-count">{organizations.length}</div>
      <div data-testid="user-role">{userRole || 'null'}</div>
      <button
        data-testid="switch-org"
        onClick={() => switchOrganization('org-2')}
      >
        Switch Org
      </button>
      <button
        data-testid="refresh-orgs"
        onClick={refreshOrganizations}
      >
        Refresh Orgs
      </button>
      <button
        data-testid="set-user"
        onClick={() => setUser(mockUser)}
      >
        Set User
      </button>
    </div>
  )
}

// Mock data
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  last_sign_in_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  factors: [],
}

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Organization 1',
    slug: 'org-1-slug',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'org-2',
    name: 'Organization 2',
    slug: 'org-2-slug',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockMemberships = [
  {
    role: 'admin',
    organizations: mockOrganizations[0],
  },
  {
    role: 'member',
    organizations: mockOrganizations[1],
  },
]

describe('OrganizationProvider', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  }

  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
    
    ;(createBrowserSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.from.mockReturnValue(mockQuery)
    
    // Mock successful auth session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    })
    
    // Mock auth state change subscription
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test since we expect it
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useOrganization must be used within an OrganizationProvider')
    
    consoleSpy.mockRestore()
  })

  it('should initialize with loading state and no initial user', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('current-org')).toHaveTextContent('null')

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('should initialize with initial user and fetch organizations', async () => {
    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('user')).toHaveTextContent('user-1')
    expect(screen.getByTestId('organizations-count')).toHaveTextContent('2')
    expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 1')
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin')

    // Verify supabase calls
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_members')
    expect(mockQuery.select).toHaveBeenCalledWith(`
          role,
          organizations (*)
        `)
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockQuery.not).toHaveBeenCalledWith('joined_at', 'is', null)
  })

  it('should use saved org from localStorage if available', async () => {
    mockLocalStorage.getItem.mockReturnValue('org-2')
    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 2')
    })

    expect(screen.getByTestId('user-role')).toHaveTextContent('member')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-2')
  })

  it('should handle fetch organizations error gracefully', async () => {
    mockQuery.select.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('organizations-count')).toHaveTextContent('0')
    expect(screen.getByTestId('current-org')).toHaveTextContent('null')
    expect(console.error).toHaveBeenCalledWith('Error fetching organizations:', { message: 'Database error' })
  })

  it('should switch organization correctly', async () => {
    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    mockQuery.single.mockResolvedValue({
      data: { role: 'member' },
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 1')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('switch-org'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 2')
    })

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentOrgId', 'org-2')
  })

  it('should not switch to non-existent organization', async () => {
    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    const TestComponentWithInvalidSwitch = () => {
      const { switchOrganization, currentOrg } = useOrganization()
      
      return (
        <div>
          <div data-testid="current-org">{currentOrg?.name || 'null'}</div>
          <button
            data-testid="switch-invalid"
            onClick={() => switchOrganization('invalid-org')}
          >
            Switch to Invalid Org
          </button>
        </div>
      )
    }

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponentWithInvalidSwitch />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 1')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('switch-invalid'))
    })

    // Should remain the same
    expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 1')
  })

  it('should refresh organizations', async () => {
    const updatedMemberships = [
      ...mockMemberships,
      {
        role: 'owner',
        organizations: {
          id: 'org-3',
          name: 'Organization 3',
          slug: 'org-3-slug',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    ]

    mockQuery.select
      .mockResolvedValueOnce({
        data: mockMemberships,
        error: null,
      })
      .mockResolvedValueOnce({
        data: updatedMemberships,
        error: null,
      })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('organizations-count')).toHaveTextContent('2')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('refresh-orgs'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('organizations-count')).toHaveTextContent('3')
    })
  })

  it('should handle auth state changes - sign in', async () => {
    let authStateCallback: (event: string, session: any) => void = () => {}

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    // Simulate sign in
    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    await act(async () => {
      authStateCallback('SIGNED_IN', { user: mockUser })
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user-1')
    })
  })

  it('should handle auth state changes - sign out', async () => {
    let authStateCallback: (event: string, session: any) => void = () => {}

    mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback
      return { data: { subscription: { unsubscribe: jest.fn() } } }
    })

    mockQuery.select.mockResolvedValue({
      data: mockMemberships,
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user-1')
    })

    // Simulate sign out
    await act(async () => {
      authStateCallback('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    expect(screen.getByTestId('current-org')).toHaveTextContent('null')
    expect(screen.getByTestId('organizations-count')).toHaveTextContent('0')
    expect(screen.getByTestId('user-role')).toHaveTextContent('null')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('currentOrgId')
  })

  it('should handle setUser functionality', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('set-user'))
    })

    expect(screen.getByTestId('user')).toHaveTextContent('user-1')
  })

  it('should handle organizations with null values', async () => {
    const membershipWithNull = [
      {
        role: 'admin',
        organizations: null,
      },
      {
        role: 'member', 
        organizations: mockOrganizations[1],
      },
    ]

    mockQuery.select.mockResolvedValue({
      data: membershipWithNull,
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('organizations-count')).toHaveTextContent('1')
    })

    expect(screen.getByTestId('current-org')).toHaveTextContent('Organization 2')
  })

  it('should unsubscribe from auth changes on unmount', () => {
    const mockUnsubscribe = jest.fn()
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })

    const { unmount } = render(
      <OrganizationProvider>
        <TestComponent />
      </OrganizationProvider>
    )

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should handle empty organizations array', async () => {
    mockQuery.select.mockResolvedValue({
      data: [],
      error: null,
    })

    render(
      <OrganizationProvider initialUser={mockUser}>
        <TestComponent />
      </OrganizationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('organizations-count')).toHaveTextContent('0')
    expect(screen.getByTestId('current-org')).toHaveTextContent('null')
    expect(screen.getByTestId('user-role')).toHaveTextContent('null')
  })
})