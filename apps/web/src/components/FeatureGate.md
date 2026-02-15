# FeatureGate Component

The `FeatureGate` component provides a clean and consistent way to implement feature gating based on billing/subscription status in your application. It integrates seamlessly with your existing billing system and organization context.

## Features

- 🔒 **Conditional Rendering**: Only show features when users have access
- 🎨 **Multiple Variants**: Card, inline, and minimal display options
- 🚀 **Upgrade Prompts**: Encourage users to upgrade with beautiful UI
- 🪝 **Hook Support**: Programmatic access to feature permissions
- 🔧 **Customizable**: Custom messages, fallbacks, and styling
- 🧪 **Well Tested**: Comprehensive test coverage
- 📱 **TypeScript**: Full type safety and IntelliSense support

## Basic Usage

```tsx
import FeatureGate from '@/components/FeatureGate'

function MyComponent() {
  return (
    <FeatureGate feature="sync">
      <button>Sync Data</button>
    </FeatureGate>
  )
}
```

## Convenience Components

For common features, use the provided convenience components:

```tsx
import { SyncGate, ExportGate, TeamMembersGate } from '@/components/FeatureGate'

function MyComponent() {
  return (
    <div>
      <SyncGate>
        <button>Sync Data</button>
      </SyncGate>
      
      <ExportGate>
        <button>Export CSV</button>
      </ExportGate>
      
      <TeamMembersGate>
        <button>Add Team Member</button>
      </TeamMembersGate>
    </div>
  )
}
```

## Variants

### Card Variant (Default)
Shows a full upgrade prompt card when access is denied:

```tsx
<FeatureGate feature="sync" variant="card">
  <SyncButton />
</FeatureGate>
```

### Inline Variant
Shows a compact inline upgrade prompt:

```tsx
<FeatureGate feature="export" variant="inline">
  <ExportButton />
</FeatureGate>
```

### Minimal Variant
Shows a minimal upgrade prompt suitable for tight spaces:

```tsx
<FeatureGate feature="team_members" variant="minimal">
  <AddMemberButton />
</FeatureGate>
```

## Programmatic Access

Use the `useFeatureAccess` hook for programmatic feature checking:

```tsx
import { useFeatureAccess } from '@/components/FeatureGate'

function MyComponent() {
  const { canSync, canExport, canAddTeamMembers, maxTeamSize, isLoading } = useFeatureAccess()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      {canSync && <button>Sync Data</button>}
      {canExport && <button>Export Data</button>}
      <p>Team size limit: {maxTeamSize}</p>
    </div>
  )
}
```

## Custom Fallback Content

Provide your own fallback instead of the default upgrade prompt:

```tsx
<FeatureGate 
  feature="sync"
  fallback={
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <p>Sync is not available in your current plan.</p>
      <button>Learn More</button>
    </div>
  }
>
  <SyncButton />
</FeatureGate>
```

## Custom Messages

Override the default upgrade message:

```tsx
<FeatureGate 
  feature="export"
  customMessage="Data export requires a premium subscription"
>
  <ExportButton />
</FeatureGate>
```

## Disable Upgrade Prompts

Hide the component entirely when access is denied:

```tsx
<FeatureGate feature="sync" showUpgradePrompt={false}>
  <SyncButton />
</FeatureGate>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `feature` | `'sync' \| 'export' \| 'team_members'` | - | Required. The feature to gate |
| `children` | `ReactNode` | - | Required. Content to show when feature is available |
| `fallback` | `ReactNode` | - | Optional. Custom fallback content |
| `showUpgradePrompt` | `boolean` | `true` | Whether to show upgrade prompt when access denied |
| `customMessage` | `string` | - | Optional. Custom message for the gate |
| `variant` | `'card' \| 'inline' \| 'minimal'` | `'card'` | Display variant |
| `className` | `string` | `''` | Additional CSS classes |

## Hook Return Value

The `useFeatureAccess` hook returns:

```typescript
{
  canSync: boolean           // Can use sync features
  canExport: boolean         // Can use export features  
  canAddTeamMembers: boolean // Can add team members
  maxTeamSize: number        // Maximum team size allowed
  isLoading: boolean         // Loading state
  refresh: () => Promise<void> // Refresh feature access
}
```

## Integration with Billing System

The component automatically integrates with your billing system through:

- `@/contexts/org-context` for organization data
- `@/lib/billing` for feature access checking
- `@/lib/supabase` for database access

Make sure these dependencies are properly set up in your application.

## Error Handling

The component gracefully handles various error scenarios:

- **Loading States**: Shows appropriate loading indicators
- **API Errors**: Falls back to restricted access and shows error messages
- **Missing Context**: Handles cases where organization context is not available
- **Network Issues**: Provides retry mechanisms through the refresh function

## Accessibility

The component follows accessibility best practices:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatible
- Color contrast compliance
- Focus management

## Testing

The component comes with comprehensive tests covering:

- Feature access granted/denied scenarios
- All variants and props combinations
- Loading and error states
- Hook functionality
- User interactions

Run tests with:

```bash
npm test FeatureGate
```

## Examples

See `FeatureGate.examples.tsx` for comprehensive usage examples including:

- Basic usage patterns
- Form integration
- Complex conditional rendering
- Custom styling approaches
- Real-world scenarios

## Contributing

When adding new features to gate:

1. Update the `FeatureType` type in `@/types/feature-gate.ts`
2. Add the feature to `FEATURE_LABELS` and `FEATURE_DESCRIPTIONS`
3. Update the billing system's `checkFeatureAccess` function
4. Add tests for the new feature
5. Update this documentation