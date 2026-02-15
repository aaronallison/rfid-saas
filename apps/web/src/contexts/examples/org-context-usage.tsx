import React from 'react';
import {
  useOrg,
  useCurrentOrg,
  useOrgLoading,
  useOrgError,
  useHasOrganization,
  useOrganizationById,
  useOrgInitialized,
  Organization,
} from '../org-context';

// Example component showing how to use the org context
export function OrgDashboard() {
  const {
    currentOrg,
    organizations,
    setCurrentOrg,
    updateOrganizations,
    addOrganization,
    removeOrganization,
    updateOrganization,
    setLoading,
    setError,
    clearError,
  } = useOrg();

  const loading = useOrgLoading();
  const error = useOrgError();
  const initialized = useOrgInitialized();

  // Example: Switching organizations
  const handleOrgSwitch = (org: Organization) => {
    setCurrentOrg(org);
  };

  // Example: Creating a new organization
  const handleCreateOrg = async (orgData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      clearError();
      
      // Simulate API call
      const newOrg: Organization = {
        ...orgData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Add to context
      addOrganization(newOrg);
      setCurrentOrg(newOrg);
      
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to create organization',
        code: 'CREATE_ORG_ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  // Example: Updating organization
  const handleUpdateOrg = async (orgId: string, updates: Partial<Organization>) => {
    try {
      setLoading(true);
      clearError();
      
      // Simulate API call
      updateOrganization(orgId, updates);
      
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to update organization',
        code: 'UPDATE_ORG_ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  // Example: Deleting organization
  const handleDeleteOrg = async (orgId: string) => {
    try {
      setLoading(true);
      clearError();
      
      // Simulate API call
      removeOrganization(orgId);
      
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to delete organization',
        code: 'DELETE_ORG_ERROR',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return <div>Initializing...</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="org-dashboard">
      {error && (
        <div className="error-banner">
          <p>Error: {error.message}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <div className="current-org">
        <h2>Current Organization</h2>
        {currentOrg ? (
          <div>
            <h3>{currentOrg.name}</h3>
            <p>{currentOrg.description}</p>
            <p>Slug: {currentOrg.slug}</p>
          </div>
        ) : (
          <p>No organization selected</p>
        )}
      </div>

      <div className="org-list">
        <h2>Organizations</h2>
        {organizations.length > 0 ? (
          <ul>
            {organizations.map((org) => (
              <li key={org.id}>
                <div>
                  <h4>{org.name}</h4>
                  <p>{org.description}</p>
                  <div className="org-actions">
                    <button onClick={() => handleOrgSwitch(org)}>
                      Switch to this org
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateOrg(org.id, {
                          description: `${org.description} (updated)`,
                        })
                      }
                    >
                      Update
                    </button>
                    <button onClick={() => handleDeleteOrg(org.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No organizations found</p>
        )}
      </div>

      <div className="create-org">
        <h2>Create Organization</h2>
        <button
          onClick={() =>
            handleCreateOrg({
              name: 'New Organization',
              slug: 'new-org',
              description: 'A new organization',
            })
          }
        >
          Create Sample Org
        </button>
      </div>
    </div>
  );
}

// Example component using utility hooks
export function OrgStatusBar() {
  const currentOrg = useCurrentOrg();
  const loading = useOrgLoading();
  const error = useOrgError();

  return (
    <div className="org-status-bar">
      <div className="current-org-info">
        {currentOrg ? (
          <span>Current: {currentOrg.name}</span>
        ) : (
          <span>No organization selected</span>
        )}
      </div>
      {loading && <div className="loading-indicator">Loading...</div>}
      {error && <div className="error-indicator">Error: {error.message}</div>}
    </div>
  );
}

// Example component checking for specific organization
export function SpecificOrgFeature({ requiredOrgId }: { requiredOrgId: string }) {
  const hasOrg = useHasOrganization(requiredOrgId);
  const org = useOrganizationById(requiredOrgId);

  if (!hasOrg) {
    return <div>This feature requires access to a specific organization.</div>;
  }

  return (
    <div>
      <h3>Feature for {org?.name}</h3>
      <p>This feature is available for {org?.name}!</p>
    </div>
  );
}