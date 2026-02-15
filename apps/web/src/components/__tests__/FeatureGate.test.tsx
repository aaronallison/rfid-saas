import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useOrganization } from '@/contexts/org-context'
import { checkFeatureAccess } from '@/lib/billing'
import FeatureGate, { SyncGate, ExportGate, TeamMembersGate, useFeatureAccess } from '../FeatureGate'

// Mock the dependencies
jest.mock('@/contexts/org-context')
jest.mock('@/lib/billing')
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({}))
}))

const mockUseOrganization = useOrganization as jest.MockedFunction<typeof useOrganization>
const mockCheckFeatureAccess = checkFeatureAccess as jest.MockedFunction<typeof checkFeatureAccess>

// Mock window.location.href
const mockLocation = {
  href: ''
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

describe('FeatureGate', () => {
  const mockOrg = {
    id: 'test-org-id',
    name: 'Test Org',
    created_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.href = ''
    
    mockUseOrganization.mockReturnValue({
      user: null,
      currentOrg: mockOrg,
      organizations: [mockOrg],
      userRole: 'owner',
      isLoading: false,
      switchOrganization: jest.fn(),
      refreshOrganizations: jest.fn(),
      setUser: jest.fn()
    })
  })

  describe('Feature Access Granted', () => {
    beforeEach(() => {
      mockCheckFeatureAccess.mockResolvedValue({
        canSync: true,
        canExport: true,
        canAddTeamMembers: true,
        maxTeamSize: 50
      })
    })

    it('renders children when feature access is granted', async () => {
      render(
        <FeatureGate feature="sync">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument()
      })
    })

    it('works with convenience components', async () => {
      render(
        <SyncGate>
          <div data-testid="sync-content">Sync Content</div>
        </SyncGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('sync-content')).toBeInTheDocument()
      })
    })
  })

  describe('Feature Access Denied', () => {
    beforeEach(() => {
      mockCheckFeatureAccess.mockResolvedValue({
        canSync: false,
        canExport: false,
        canAddTeamMembers: false,
        maxTeamSize: 3
      })
    })

    it('shows upgrade prompt when access is denied', async () => {
      render(
        <FeatureGate feature="sync">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText(/Data Sync requires Pro plan/)).toBeInTheDocument()
        expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('shows custom fallback when provided', async () => {
      render(
        <FeatureGate 
          feature="sync"
          fallback={<div data-testid="custom-fallback">Custom Fallback</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('shows nothing when showUpgradePrompt is false', async () => {
      render(
        <FeatureGate feature="sync" showUpgradePrompt={false}>
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.queryByText(/Data Sync requires Pro plan/)).not.toBeInTheDocument()
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })

    it('redirects to billing page when upgrade button is clicked', async () => {
      render(
        <FeatureGate feature="sync">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText(/Upgrade to Pro/)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText(/Upgrade to Pro/))
      expect(mockLocation.href).toBe('/billing')
    })
  })

  describe('Variants', () => {
    beforeEach(() => {
      mockCheckFeatureAccess.mockResolvedValue({
        canSync: false,
        canExport: false,
        canAddTeamMembers: false,
        maxTeamSize: 3
      })
    })

    it('renders minimal variant correctly', async () => {
      render(
        <FeatureGate feature="sync" variant="minimal">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText(/Data Sync requires Pro plan/)).toBeInTheDocument()
        expect(screen.getByText('Upgrade')).toBeInTheDocument()
      })
    })

    it('renders inline variant correctly', async () => {
      render(
        <FeatureGate feature="export" variant="inline">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText(/Data Export requires upgrade/)).toBeInTheDocument()
        expect(screen.getByText(/Export your data to various formats/)).toBeInTheDocument()
      })
    })
  })

  describe('Custom Messages', () => {
    beforeEach(() => {
      mockCheckFeatureAccess.mockResolvedValue({
        canSync: false,
        canExport: false,
        canAddTeamMembers: false,
        maxTeamSize: 3
      })
    })

    it('displays custom message when provided', async () => {
      render(
        <FeatureGate 
          feature="sync" 
          customMessage="Custom upgrade message"
        >
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Custom upgrade message')).toBeInTheDocument()
      })
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading state', () => {
      mockCheckFeatureAccess.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <FeatureGate feature="sync">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument() // Loading spinner
    })

    it('shows error state when feature access check fails', async () => {
      mockCheckFeatureAccess.mockRejectedValue(new Error('API Error'))

      render(
        <FeatureGate feature="sync">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText(/Unable to verify feature access/)).toBeInTheDocument()
      })
    })

    it('shows minimal error state for minimal variant', async () => {
      mockCheckFeatureAccess.mockRejectedValue(new Error('API Error'))

      render(
        <FeatureGate feature="sync" variant="minimal">
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Error loading access')).toBeInTheDocument()
      })
    })
  })

  describe('No Organization Context', () => {
    it('handles missing organization context gracefully', async () => {
      mockUseOrganization.mockReturnValue({
        user: null,
        currentOrg: null,
        organizations: [],
        userRole: null,
        isLoading: false,
        switchOrganization: jest.fn(),
        refreshOrganizations: jest.fn(),
        setUser: jest.fn()
      })

      render(
        <FeatureGate feature="sync" showUpgradePrompt={false}>
          <div data-testid="protected-content">Protected Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      })
    })
  })
})

describe('useFeatureAccess Hook', () => {
  const mockOrg = {
    id: 'test-org-id',
    name: 'Test Org',
    created_at: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseOrganization.mockReturnValue({
      user: null,
      currentOrg: mockOrg,
      organizations: [mockOrg],
      userRole: 'owner',
      isLoading: false,
      switchOrganization: jest.fn(),
      refreshOrganizations: jest.fn(),
      setUser: jest.fn()
    })
  })

  it('returns feature access data correctly', async () => {
    mockCheckFeatureAccess.mockResolvedValue({
      canSync: true,
      canExport: false,
      canAddTeamMembers: true,
      maxTeamSize: 50
    })

    const TestComponent = () => {
      const featureAccess = useFeatureAccess()
      return (
        <div>
          <div data-testid="can-sync">{featureAccess.canSync.toString()}</div>
          <div data-testid="can-export">{featureAccess.canExport.toString()}</div>
          <div data-testid="max-team-size">{featureAccess.maxTeamSize}</div>
          <div data-testid="is-loading">{featureAccess.isLoading.toString()}</div>
        </div>
      )
    }

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('can-sync')).toHaveTextContent('true')
      expect(screen.getByTestId('can-export')).toHaveTextContent('false')
      expect(screen.getByTestId('max-team-size')).toHaveTextContent('50')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })
  })
})