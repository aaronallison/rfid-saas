# Organization Context

A React context for managing organization state in the RFID Field Capture + Sync SaaS application.

## Features

- **State Management**: Uses `useReducer` for predictable state updates
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Performance**: Uses `useCallback` to prevent unnecessary re-renders
- **Error Handling**: Structured error handling with `ApiError` type
- **Utility Hooks**: Convenient hooks for common use cases
- **Testing**: Comprehensive test coverage

## Usage

### Basic Setup

Wrap your app with the `OrgProvider`:

```tsx
import { OrgProvider } from './contexts/org-context';

function App() {
  return (
    <OrgProvider>
      <YourAppContent />
    </OrgProvider>
  );
}
```

### Using the Context

#### Main Hook

```tsx
import { useOrg } from './contexts/org-context';

function MyComponent() {
  const {
    currentOrg,
    organizations,
    loading,
    error,
    initialized,
    setCurrentOrg,
    updateOrganizations,
    addOrganization,
    removeOrganization,
    updateOrganization,
    setLoading,
    setError,
    clearError,
  } = useOrg();

  // Your component logic
}
```

#### Utility Hooks

```tsx
import {
  useCurrentOrg,
  useOrgLoading,
  useOrgError,
  useHasOrganization,
  useOrganizationById,
  useOrgInitialized,
} from './contexts/org-context';

function StatusComponent() {
  const currentOrg = useCurrentOrg();
  const loading = useOrgLoading();
  const error = useOrgError();
  const initialized = useOrgInitialized();

  // Component logic
}
```

## API Reference

### Types

#### `Organization`
```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  settings?: OrganizationSettings;
}
```

#### `OrgState`
```typescript
interface OrgState {
  currentOrg: Organization | null;
  organizations: Organization[];
  loading: boolean;
  error: ApiError | null;
  initialized: boolean;
}
```

#### `ApiError`
```typescript
interface ApiError {
  message: string;
  code?: string;
  field?: string;
}
```

### Context Methods

#### `setCurrentOrg(org: Organization | null)`
Sets the current active organization.

#### `updateOrganizations(orgs: Organization[])`
Replaces the entire organizations array.

#### `addOrganization(org: Organization)`
Adds a new organization to the list.

#### `removeOrganization(orgId: string)`
Removes an organization by ID and clears currentOrg if it matches.

#### `updateOrganization(orgId: string, updates: Partial<Organization>)`
Updates specific fields of an organization.

#### `setLoading(loading: boolean)`
Sets the loading state.

#### `setError(error: ApiError | null)`
Sets an error state and automatically sets loading to false.

#### `clearError()`
Clears the current error state.

#### `initialize()`
Marks the context as initialized.

### Utility Hooks

#### `useCurrentOrg(): Organization | null`
Returns the current active organization.

#### `useOrgLoading(): boolean`
Returns the current loading state.

#### `useOrgError(): ApiError | null`
Returns the current error state.

#### `useHasOrganization(orgId: string): boolean`
Checks if an organization with the given ID exists.

#### `useOrganizationById(orgId: string): Organization | undefined`
Returns the organization with the given ID.

#### `useOrgInitialized(): boolean`
Returns whether the context has been initialized.

## Best Practices

1. **Error Handling**: Always check for errors and provide user feedback
2. **Loading States**: Use loading states to provide better UX
3. **Type Safety**: Use the provided types for better development experience
4. **Performance**: Use utility hooks when you only need specific pieces of state
5. **Testing**: Mock the context in tests using the provided test utilities

## Testing

The context includes comprehensive tests. Run tests with:

```bash
npm test apps/web/src/contexts/__tests__/org-context.test.tsx
```

See the test file for examples of how to test components that use the org context.

## Examples

Check out the `examples/org-context-usage.tsx` file for complete examples of how to use the organization context in various scenarios.

## Error Codes

Common error codes used in the context:

- `CREATE_ORG_ERROR`: Failed to create organization
- `UPDATE_ORG_ERROR`: Failed to update organization
- `DELETE_ORG_ERROR`: Failed to delete organization
- `FETCH_ORG_ERROR`: Failed to fetch organizations
- `PERMISSION_ERROR`: Insufficient permissions

## Migration Guide

If migrating from a previous version:

1. Update imports to use the new utility hooks
2. Replace direct error string handling with `ApiError` objects
3. Use the new CRUD methods for organization management
4. Add initialization checks using `useOrgInitialized`