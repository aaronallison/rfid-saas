import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { OrgProvider, useOrg, useCurrentOrg, useOrgLoading, Organization } from '../org-context';

const mockOrganization: Organization = {
  id: '1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockOrganizations: Organization[] = [
  mockOrganization,
  {
    id: '2',
    name: 'Another Organization',
    slug: 'another-org',
    description: 'Another test organization',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
];

describe('OrgContext', () => {
  describe('useOrg hook', () => {
    it('throws error when used outside of OrgProvider', () => {
      const { result } = renderHook(() => useOrg());
      
      expect(result.error).toEqual(
        Error('useOrg must be used within an OrgProvider')
      );
    });

    it('provides initial state when used within OrgProvider', () => {
      const { result } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      expect(result.current).toEqual({
        currentOrg: null,
        organizations: [],
        loading: false,
        error: null,
        setCurrentOrg: expect.any(Function),
        updateOrganizations: expect.any(Function),
        setLoading: expect.any(Function),
        setError: expect.any(Function),
        clearError: expect.any(Function),
      });
    });
  });

  describe('state management', () => {
    it('sets current organization', () => {
      const { result } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      act(() => {
        result.current.setCurrentOrg(mockOrganization);
      });

      expect(result.current.currentOrg).toEqual(mockOrganization);
    });

    it('updates organizations list', () => {
      const { result } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      act(() => {
        result.current.updateOrganizations(mockOrganizations);
      });

      expect(result.current.organizations).toEqual(mockOrganizations);
    });

    it('sets loading state', () => {
      const { result } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('sets and clears error state', () => {
      const { result } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      const errorMessage = 'Test error';

      act(() => {
        result.current.setError(errorMessage);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false); // Should set loading to false

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('utility hooks', () => {
    it('useCurrentOrg returns current organization', () => {
      const { result: orgResult } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      const { result: currentOrgResult } = renderHook(() => useCurrentOrg(), {
        wrapper: OrgProvider,
      });

      expect(currentOrgResult.current).toBeNull();

      act(() => {
        orgResult.current.setCurrentOrg(mockOrganization);
      });

      // Re-render the hook to get updated value
      const { result: updatedCurrentOrgResult } = renderHook(() => useCurrentOrg(), {
        wrapper: OrgProvider,
      });

      expect(updatedCurrentOrgResult.current).toEqual(mockOrganization);
    });

    it('useOrgLoading returns loading state', () => {
      const { result: orgResult } = renderHook(() => useOrg(), {
        wrapper: OrgProvider,
      });

      const { result: loadingResult } = renderHook(() => useOrgLoading(), {
        wrapper: OrgProvider,
      });

      expect(loadingResult.current).toBe(false);

      act(() => {
        orgResult.current.setLoading(true);
      });

      // Re-render the hook to get updated value
      const { result: updatedLoadingResult } = renderHook(() => useOrgLoading(), {
        wrapper: OrgProvider,
      });

      expect(updatedLoadingResult.current).toBe(true);
    });
  });

  describe('Provider component', () => {
    it('renders children correctly', () => {
      const TestComponent = () => <div data-testid="test-child">Test</div>;

      const { getByTestId } = render(
        <OrgProvider>
          <TestComponent />
        </OrgProvider>
      );

      expect(getByTestId('test-child')).toBeInTheDocument();
    });
  });
});