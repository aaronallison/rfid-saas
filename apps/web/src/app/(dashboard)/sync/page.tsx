'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface SyncStats {
  totalBatches: number
  totalCaptures: number
  lastSyncTime: string | null
}

interface SyncStatus {
  isOnline: boolean
  lastChecked: Date
  error: string | null
}

export default function SyncPage() {
  const [stats, setStats] = useState<SyncStats>({
    totalBatches: 0,
    totalCaptures: 0,
    lastSyncTime: null,
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: false,
    lastChecked: new Date(),
    error: null,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  
  const { currentOrg, user } = useOrganization()
  const supabase = createBrowserSupabaseClient()

  const checkConnectionStatus = async () => {
    try {
      const { data, error: connectionError } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)

      setSyncStatus({
        isOnline: !connectionError,
        lastChecked: new Date(),
        error: connectionError?.message || null,
      })
    } catch (error) {
      setSyncStatus({
        isOnline: false,
        lastChecked: new Date(),
        error: 'Failed to check connection',
      })
    }
  }

  const fetchSyncStats = async () => {
    if (!currentOrg) return

    setIsRefreshing(true)
    setError('')

    try {
      // Fetch total batches for the organization
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('organization_id', currentOrg.id)

      if (batchError) {
        throw new Error(batchError.message)
      }

      // Get batch IDs for capture queries
      const batchIds = batches?.map(b => b.id) || []

      if (batchIds.length === 0) {
        setStats({
          totalBatches: 0,
          totalCaptures: 0,
          lastSyncTime: null,
        })
        await checkConnectionStatus()
        return
      }

      // Fetch most recent capture for last sync time
      const { data: recentCapture, error: captureError } = await supabase
        .from('captures')
        .select('created_at')
        .in('batch_id', batchIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get total capture count
      const { count: captureCount, error: countError } = await supabase
        .from('captures')
        .select('*', { count: 'exact', head: true })
        .in('batch_id', batchIds)

      if (countError) {
        throw new Error(countError.message)
      }

      setStats({
        totalBatches: batches?.length || 0,
        totalCaptures: captureCount || 0,
        lastSyncTime: recentCapture?.created_at || null,
      })

      await checkConnectionStatus()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch sync stats')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    await fetchSyncStats()
  }

  const handleTestConnection = async () => {
    setIsRefreshing(true)
    await checkConnectionStatus()
    setIsRefreshing(false)
  }

  useEffect(() => {
    if (currentOrg) {
      fetchSyncStats()
    }
  }, [currentOrg])

  // Auto-refresh connection status every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkConnectionStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getTimeSinceLastSync = () => {
    if (!stats.lastSyncTime) return 'Never'
    
    const now = new Date()
    const lastSync = new Date(stats.lastSyncTime)
    const diffMs = now.getTime() - lastSync.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Please select an organization first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Sync</h1>
          <p className="text-muted-foreground">
            Monitor sync status and data statistics for {currentOrg.name}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center space-x-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-600" />
                <span>Offline</span>
              </>
            )}
          </CardTitle>
          <CardDescription>
            Connection status • Last checked: {syncStatus.lastChecked.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {syncStatus.error && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>{syncStatus.error}</span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isRefreshing}
              size="sm"
            >
              <Activity className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-pulse')} />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              Data collection batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Captures</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCaptures}</div>
            <p className="text-xs text-muted-foreground">
              RFID captures recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTimeSinceLastSync()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSyncTime ? formatDate(stats.lastSyncTime) : 'No activity yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Data Sync</CardTitle>
          <CardDescription>
            How data synchronization works in your RFID system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Real-time Sync</h4>
            <p className="text-sm text-muted-foreground">
              • Data captured on mobile devices is automatically synchronized to the cloud
            </p>
            <p className="text-sm text-muted-foreground">
              • Web dashboard displays real-time data from all connected devices
            </p>
            <p className="text-sm text-muted-foreground">
              • Offline support ensures no data loss during connectivity issues
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Data Flow</h4>
            <p className="text-sm text-muted-foreground">
              1. RFID tags are scanned on mobile devices
            </p>
            <p className="text-sm text-muted-foreground">
              2. Data is stored locally for offline resilience
            </p>
            <p className="text-sm text-muted-foreground">
              3. When online, data syncs automatically to the cloud
            </p>
            <p className="text-sm text-muted-foreground">
              4. Web dashboard updates in real-time with synchronized data
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Connection Status</h4>
            <p className="text-sm text-muted-foreground">
              • Green indicator means you're connected and data is syncing
            </p>
            <p className="text-sm text-muted-foreground">
              • Red indicator means there's a connectivity issue
            </p>
            <p className="text-sm text-muted-foreground">
              • Connection status is checked automatically every 30 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}