/**
 * Type definitions for FeatureGate component
 */

export type FeatureType = 'sync' | 'export' | 'team_members'

export interface FeatureAccess {
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
}

export interface FeatureGateProps {
  /** The feature to gate */
  feature: FeatureType
  /** Content to show when feature is available */
  children: React.ReactNode
  /** Optional fallback content instead of default upgrade prompt */
  fallback?: React.ReactNode
  /** Whether to show as a simple disable state vs upgrade prompt */
  showUpgradePrompt?: boolean
  /** Custom message for the gate */
  customMessage?: string
  /** Variant of the gate display */
  variant?: 'card' | 'inline' | 'minimal'
  /** Additional CSS classes */
  className?: string
}

export interface UseFeatureAccessReturn extends FeatureAccess {
  isLoading: boolean
  refresh: () => Promise<void>
}