'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { Organization, ApiError } from './types';

// Re-export for convenience
export type { Organization } from './types';

export interface OrgState {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  error: ApiError | null;
  initialized: boolean;
}

export interface OrgContextValue extends OrgState {
  setCurrentOrg: (org: Organization | null) => void;
  updateOrganizations: (orgs: Organization[]) => void;
  addOrganization: (org: Organization) => void;
  removeOrganization: (orgId: string) => void;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  initialize: () => void;
}

// Action types
type OrgAction =
  | { type: 'SET_CURRENT_ORG'; payload: Organization | null }
  | { type: 'UPDATE_ORGANIZATIONS'; payload: Organization[] }
  | { type: 'ADD_ORGANIZATION'; payload: Organization }
  | { type: 'REMOVE_ORGANIZATION'; payload: string }
  | { type: 'UPDATE_ORGANIZATION'; payload: { id: string; updates: Partial<Organization> } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ApiError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INITIALIZE' };

// Initial state
const initialState: OrgState = {
  currentOrg: null,
  organizations: [],
  loading: false,
  error: null,
  initialized: false,
};

// Reducer
function orgReducer(state: OrgState, action: OrgAction): OrgState {
  switch (action.type) {
    case 'SET_CURRENT_ORG':
      return {
        ...state,
        currentOrg: action.payload,
      };
    case 'UPDATE_ORGANIZATIONS':
      return {
        ...state,
        organizations: action.payload,
      };
    case 'ADD_ORGANIZATION':
      return {
        ...state,
        organizations: [...state.organizations, action.payload],
      };
    case 'REMOVE_ORGANIZATION':
      return {
        ...state,
        organizations: state.organizations.filter(org => org.id !== action.payload),
        // Clear current org if it's the one being removed
        currentOrg: state.currentOrg?.id === action.payload ? null : state.currentOrg,
      };
    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        organizations: state.organizations.map(org =>
          org.id === action.payload.id
            ? { ...org, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : org
        ),
        // Update current org if it's the one being updated
        currentOrg: state.currentOrg?.id === action.payload.id
          ? { ...state.currentOrg, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : state.currentOrg,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'INITIALIZE':
      return {
        ...state,
        initialized: true,
      };
    default:
      return state;
  }
}

// Context
const OrgContext = createContext<OrgContextValue | undefined>(undefined);

// Provider component
interface OrgProviderProps {
  children: ReactNode;
}

export function OrgProvider({ children }: OrgProviderProps) {
  const [state, dispatch] = useReducer(orgReducer, initialState);

  // Initialize context on mount
  useEffect(() => {
    dispatch({ type: 'INITIALIZE' });
  }, []);

  const setCurrentOrg = useCallback((org: Organization | null) => {
    dispatch({ type: 'SET_CURRENT_ORG', payload: org });
  }, []);

  const updateOrganizations = useCallback((orgs: Organization[]) => {
    dispatch({ type: 'UPDATE_ORGANIZATIONS', payload: orgs });
  }, []);

  const addOrganization = useCallback((org: Organization) => {
    dispatch({ type: 'ADD_ORGANIZATION', payload: org });
  }, []);

  const removeOrganization = useCallback((orgId: string) => {
    dispatch({ type: 'REMOVE_ORGANIZATION', payload: orgId });
  }, []);

  const updateOrganization = useCallback((orgId: string, updates: Partial<Organization>) => {
    dispatch({ type: 'UPDATE_ORGANIZATION', payload: { id: orgId, updates } });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: ApiError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const initialize = useCallback(() => {
    dispatch({ type: 'INITIALIZE' });
  }, []);

  const value: OrgContextValue = {
    ...state,
    setCurrentOrg,
    updateOrganizations,
    addOrganization,
    removeOrganization,
    updateOrganization,
    setLoading,
    setError,
    clearError,
    initialize,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

// Hook
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

// Utility hook for current organization
export function useCurrentOrg(): Organization | null {
  const { currentOrg } = useOrg();
  return currentOrg;
}

// Utility hook for organization loading state
export function useOrgLoading(): boolean {
  const { loading } = useOrg();
  return loading;
}

// Utility hook for organization error state
export function useOrgError(): ApiError | null {
  const { error } = useOrg();
  return error;
}

// Utility hook to check if a specific organization exists
export function useHasOrganization(orgId: string): boolean {
  const { organizations } = useOrg();
  return organizations.some(org => org.id === orgId);
}

// Utility hook to get organization by ID
export function useOrganizationById(orgId: string): Organization | undefined {
  const { organizations } = useOrg();
  return organizations.find(org => org.id === orgId);
}

// Utility hook to check if context is initialized
export function useOrgInitialized(): boolean {
  const { initialized } = useOrg();
  return initialized;
}