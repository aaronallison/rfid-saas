'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrganization } from '@/contexts/org-context'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { getBillingInfo, checkFeatureAccess, type BillingInfo } from '@/lib/billing'
import { 
  CreditCard, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2,
  Crown
} from 'lucide-react'

export default function BillingPage() {
  const { currentOrg } = useOrganization()
  const searchParams = useSearchParams()
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [featureAccess, setFeatureAccess] = useState({
    canSync: false,
    canExport: false,
    canAddTeamMembers: false,
    maxTeamSize: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    if (currentOrg) {
      loadBillingData()
    }
  }, [currentOrg])

  useEffect(() => {
    // Handle success/cancel from Stripe Checkout
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success) {
      // Refresh billing data after successful checkout
      setTimeout(() => {
        loadBillingData()
      }, 2000) // Give webhook time to process
    }
  }, [searchParams])

  const loadBillingData = async () => {
    if (!currentOrg) return

    try {
      setIsLoading(true)
      const [billing, access] = await Promise.all([
        getBillingInfo(supabase, currentOrg.id),
        checkFeatureAccess(supabase, currentOrg.id)
      ])
      
      setBillingInfo(billing)
      setFeatureAccess(access)
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!currentOrg) return

    try {
      setActionLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          org_id: currentOrg.id,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!currentOrg) return

    try {
      setActionLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          org_id: currentOrg.id,
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'text-green-600'
      case 'trialing':
        return 'text-blue-600'
      case 'past_due':
        return 'text-yellow-600'
      case 'canceled':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Check className="h-4 w-4 text-green-600" />
      case 'trialing':
        return <Crown className="h-4 w-4 text-blue-600" />
      case 'past_due':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'canceled':
        return <X className="h-4 w-4 text-red-600" />
      default:
        return <X className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  const hasActiveBilling = billingInfo?.billing_status === 'active' || billingInfo?.billing_status === 'trialing'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
      </div>

      {/* Success/Cancel Messages */}
      {searchParams.get('success') && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-800">
                Subscription activated successfully! Your billing status will update shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {searchParams.get('canceled') && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                Checkout was canceled. No charges were made to your account.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Current Plan</span>
          </CardTitle>
          <CardDescription>
            Your current subscription status and features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(billingInfo?.billing_status || null)}
              <span className="font-medium">
                {billingInfo?.billing_status ? (
                  <span className={getStatusColor(billingInfo.billing_status)}>
                    {billingInfo.billing_status === 'active' ? 'Pro Plan' : 
                     billingInfo.billing_status === 'trialing' ? 'Pro Plan (Trial)' :
                     billingInfo.billing_status === 'past_due' ? 'Pro Plan (Payment Due)' :
                     'Subscription Canceled'}
                  </span>
                ) : (
                  <span className="text-gray-600">Free Plan</span>
                )}
              </span>
            </div>
            
            <div className="flex space-x-2">
              {hasActiveBilling ? (
                <Button 
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  variant="outline"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Manage Subscription
                </Button>
              ) : (
                <Button 
                  onClick={handleSubscribe}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Basic features for getting started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Up to 3 team members</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Basic RFID capture</span>
            </div>
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-600" />
              <span>No data sync</span>
            </div>
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-600" />
              <span>No data export</span>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={hasActiveBilling ? 'ring-2 ring-blue-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Pro Plan</span>
              {hasActiveBilling && <Crown className="h-4 w-4 text-blue-600" />}
            </CardTitle>
            <CardDescription>Advanced features for growing teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Up to 50 team members</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Advanced RFID capture</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Real-time data sync</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Data export & analytics</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle>Your Current Access</CardTitle>
          <CardDescription>Features available with your current plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span>Data Sync</span>
              {featureAccess.canSync ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Data Export</span>
              {featureAccess.canExport ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Team Members</span>
              <span className="text-sm text-muted-foreground">
                Up to {featureAccess.maxTeamSize}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}