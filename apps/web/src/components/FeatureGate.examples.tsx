/**
 * FeatureGate Component Usage Examples
 * 
 * This file demonstrates various ways to use the FeatureGate component
 * for implementing feature gating based on billing/subscription status.
 */

import FeatureGate, { SyncGate, ExportGate, TeamMembersGate, useFeatureAccess } from './FeatureGate'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

// Example 1: Basic usage with default card variant
export function BasicFeatureGateExample() {
  return (
    <FeatureGate feature="sync">
      <div className="p-4 bg-green-100 rounded-lg">
        <h3 className="font-semibold">Sync is Available!</h3>
        <p>You can now sync your data across devices.</p>
        <Button>Start Sync</Button>
      </div>
    </FeatureGate>
  )
}

// Example 2: Using convenience components
export function ConvenienceComponentsExample() {
  return (
    <div className="space-y-4">
      <SyncGate>
        <Button>Sync Data</Button>
      </SyncGate>

      <ExportGate>
        <Button>Export to CSV</Button>
      </ExportGate>

      <TeamMembersGate>
        <Button>Invite Team Member</Button>
      </TeamMembersGate>
    </div>
  )
}

// Example 3: Minimal variant for inline usage
export function MinimalVariantExample() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <h4 className="font-medium">Advanced Analytics</h4>
        <p className="text-sm text-muted-foreground">View detailed insights</p>
      </div>
      
      <FeatureGate feature="export" variant="minimal" showUpgradePrompt>
        <Button>View Analytics</Button>
      </FeatureGate>
    </div>
  )
}

// Example 4: Inline variant for feature sections
export function InlineVariantExample() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
        </CardHeader>
        <CardContent>
          <FeatureGate feature="export" variant="inline">
            <div className="space-y-4">
              <p>Export your data in various formats:</p>
              <div className="space-x-2">
                <Button>Export CSV</Button>
                <Button>Export JSON</Button>
                <Button>Export PDF</Button>
              </div>
            </div>
          </FeatureGate>
        </CardContent>
      </Card>
    </div>
  )
}

// Example 5: Custom fallback content
export function CustomFallbackExample() {
  return (
    <FeatureGate 
      feature="sync"
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800">Sync Unavailable</h4>
          <p className="text-yellow-700 text-sm">
            Your current plan doesn't include sync functionality.
          </p>
          <Button size="sm" className="mt-2">
            Learn More
          </Button>
        </div>
      }
    >
      <Button>Enable Sync</Button>
    </FeatureGate>
  )
}

// Example 6: Disable without upgrade prompt
export function DisabledWithoutPromptExample() {
  return (
    <div className="space-y-2">
      <h4 className="font-medium">Export Options</h4>
      <div className="space-x-2">
        <Button>Basic Export</Button>
        
        {/* This button will only show if export feature is available */}
        <FeatureGate feature="export" showUpgradePrompt={false}>
          <Button variant="outline">Advanced Export</Button>
        </FeatureGate>
      </div>
    </div>
  )
}

// Example 7: Custom message
export function CustomMessageExample() {
  return (
    <FeatureGate 
      feature="team_members"
      customMessage="Team collaboration requires a premium subscription"
    >
      <div className="space-y-4">
        <h4 className="font-medium">Team Management</h4>
        <Button>Add Team Member</Button>
      </div>
    </FeatureGate>
  )
}

// Example 8: Using the hook for programmatic access
export function HookUsageExample() {
  const { canSync, canExport, canAddTeamMembers, maxTeamSize, isLoading } = useFeatureAccess()

  if (isLoading) {
    return <div>Loading feature access...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Feature Access Status</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={canSync ? 'text-green-600' : 'text-red-600'}>
              {canSync ? 'Available' : 'Not Available'}
            </p>
            {canSync && <Button size="sm">Start Sync</Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={canExport ? 'text-green-600' : 'text-red-600'}>
              {canExport ? 'Available' : 'Not Available'}
            </p>
            {canExport && <Button size="sm">Export Data</Button>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Up to {maxTeamSize} members
            </p>
            {canAddTeamMembers && <Button size="sm">Add Member</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Example 9: Complex conditional rendering
export function ConditionalRenderingExample() {
  const { canSync, canExport } = useFeatureAccess()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Operations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Always show basic operations */}
        <Button variant="outline">View Data</Button>
        
        {/* Conditionally show premium features */}
        <div className="space-y-2">
          {canSync ? (
            <Button>Sync All Data</Button>
          ) : (
            <FeatureGate feature="sync" variant="minimal" />
          )}
          
          {canExport ? (
            <div className="space-x-2">
              <Button>Export CSV</Button>
              <Button>Export JSON</Button>
            </div>
          ) : (
            <FeatureGate feature="export" variant="inline" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Example 10: Form with gated features
export function FormWithGatedFeaturesExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic settings always available */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Project Name
          </label>
          <input 
            type="text" 
            className="w-full p-2 border rounded-md"
            placeholder="Enter project name"
          />
        </div>

        {/* Gated feature: Advanced sync settings */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Sync Settings
          </label>
          <SyncGate variant="inline">
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input type="checkbox" />
                <span className="text-sm">Enable real-time sync</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" />
                <span className="text-sm">Sync media files</span>
              </label>
            </div>
          </SyncGate>
        </div>

        {/* Gated feature: Team collaboration */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Team Access
          </label>
          <TeamMembersGate variant="inline">
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Invite Team Members
              </Button>
              <p className="text-xs text-muted-foreground">
                Share this project with your team
              </p>
            </div>
          </TeamMembersGate>
        </div>

        <div className="pt-4 border-t">
          <Button>Save Settings</Button>
        </div>
      </CardContent>
    </Card>
  )
}