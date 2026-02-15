'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { checkFeatureAccess } from '@/lib/billing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Crown, 
  Lock, 
  Loader2,
  ArrowRight,
  AlertTriangle 
} from 'lucide-react'

export type FeatureType = 'sync' | 'export' | 'team_members'

interface FeatureGateProps {
  /** The feature to gate */
  feature: FeatureType
  /** Content to show when feature is available */
  children: ReactNode
  /** Optional fallback content instead of default upgrade prompt */
  fallback?: ReactNode
  /** Whether to show as a simple disable state vs upgrade prompt */
  showUpgradePrompt?: boolean
  /** Custom message for the gate */
  customMessage?: string
  /** Variant of the gate display */
  variant?: 'card' | 'inline' | 'minimal'
  /** Additional CSS classes */
  className?: string
}

interface FeatureAccess {
  canSync: boolean
  canExport: boolean
  canAddTeamMembers: boolean
  maxTeamSize: number
}

const DEFAULT_FEATURE_ACCESS: FeatureAccess = {
  canSync: false,
  canExport: false,
  canAddTeamMembers: true,
  maxTeamSize: 3
}

const FEATURE_LABELS: Record<FeatureType, string> = {
  sync: 'Data Sync',
  export: 'Data Export',
  team_members: 'Team Management'
}

const FEATURE_DESCRIPTIONS: Record<FeatureType, string> = {
  sync: 'Sync your data across all devices in real-time',
  export: 'Export your data to various formats for analysis',
  team_members: 'Add more team members to collaborate on projects'
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  customMessage,
  variant = 'card',
  className = ''
}: FeatureGateProps) {
  const { currentOrg } = useOrganization()
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>(DEFAULT_FEATURE_ACCESS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    if (currentOrg) {
      loadFeatureAccess()
    } else {
      setIsLoading(false)
    }
  }, [currentOrg])

  const loadFeatureAccess = async () => {
    if (!currentOrg) return

    try {
      setIsLoading(true)
      setError(null)
      const access = await checkFeatureAccess(supabase, currentOrg.id)
      setFeatureAccess(access)
    } catch (err) {
      console.error('Error loading feature access:', err)
      setError('Failed to load feature access')
      // Fallback to default (restricted) access on error
      setFeatureAccess(DEFAULT_FEATURE_ACCESS)
    } finally {
      setIsLoading(false)
    }
  }

  const hasAccess = (): boolean => {
    switch (feature) {
      case 'sync':
        return featureAccess.canSync
      case 'export':
        return featureAccess.canExport
      case 'team_members':
        return featureAccess.canAddTeamMembers
      default:
        return false
    }
  }

  const handleUpgradeClick = () => {
    window.location.href = '/billing'
  }

  // Show loading state
  if (isLoading) {
    if (variant === 'minimal') {
      return <Loader2 className="h-4 w-4 animate-spin" data-testid="loading-spinner" />
    }
    
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" data-testid="loading-spinner" />
      </div>
    )
  }

  // Show error state
  if (error) {
    if (variant === 'minimal') {
      return (
        <div className="flex items-center text-red-600">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span className="text-sm">Error loading access</span>
        </div>
      )
    }

    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Unable to verify feature access. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If user has access, render children
  if (hasAccess()) {
    return <>{children}</>
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // If not showing upgrade prompt, just don't render anything
  if (!showUpgradePrompt) {
    return null
  }

  const featureLabel = FEATURE_LABELS[feature]
  const featureDescription = FEATURE_DESCRIPTIONS[feature]

  // Render upgrade prompt based on variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 text-muted-foreground ${className}`}>
        <Lock className="h-4 w-4" />
        <span className="text-sm">
          {customMessage || `${featureLabel} requires Pro plan`}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleUpgradeClick}
          className="h-6 px-2 text-xs"
        >
          Upgrade
        </Button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-between p-4 bg-muted/50 rounded-lg border ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-background rounded-md border">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {customMessage || `${featureLabel} requires upgrade`}
            </p>
            <p className="text-xs text-muted-foreground">
              {featureDescription}
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={handleUpgradeClick}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Crown className="h-3 w-3 mr-1" />
          Upgrade
        </Button>
      </div>
    )
  }

  // Default card variant
  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
          <Crown className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg">
          {customMessage || `${featureLabel} requires Pro plan`}
        </CardTitle>
        <CardDescription>
          {featureDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Upgrade to Pro to unlock:</p>
          <ul className="space-y-1">
            <li>• Real-time data sync</li>
            <li>• Data export capabilities</li>
            <li>• Up to 50 team members</li>
            <li>• Priority support</li>
          </ul>
        </div>
        <Button 
          onClick={handleUpgradeClick}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="lg"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Pro
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

// Convenience components for specific features
export function SyncGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return <FeatureGate feature="sync" {...props}>{children}</FeatureGate>
}

export function ExportGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return <FeatureGate feature="export" {...props}>{children}</FeatureGate>
}

export function TeamMembersGate({ children, ...props }: Omit<FeatureGateProps, 'feature'>) {
  return <FeatureGate feature="team_members" {...props}>{children}</FeatureGate>
}

// Hook for programmatic feature access checking
export function useFeatureAccess() {
  const { currentOrg } = useOrganization()
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess>(DEFAULT_FEATURE_ACCESS)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    if (currentOrg) {
      loadFeatureAccess()
    } else {
      setIsLoading(false)
    }
  }, [currentOrg])

  const loadFeatureAccess = async () => {
    if (!currentOrg) return

    try {
      setIsLoading(true)
      const access = await checkFeatureAccess(supabase, currentOrg.id)
      setFeatureAccess(access)
    } catch (err) {
      console.error('Error loading feature access:', err)
      setFeatureAccess(DEFAULT_FEATURE_ACCESS)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    ...featureAccess,
    isLoading,
    refresh: loadFeatureAccess
  }
}