'use client'

import { useEffect, useState } from 'react'
import { BillingStatus, canPerformAction } from '@/lib/billing'

interface FeatureGateProps {
  orgId: string
  feature: 'sync' | 'export' | 'addTeamMember'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function FeatureGate({ orgId, feature, children, fallback }: FeatureGateProps) {
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/billing/status?orgId=${orgId}`)
        if (response.ok) {
          const status = await response.json()
          setBillingStatus(status)
        }
      } catch (error) {
        console.error('Error fetching billing status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [orgId])

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
  }

  if (!billingStatus || !canPerformAction(billingStatus, feature)) {
    return fallback || (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Premium Feature
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>This feature requires an active subscription.</p>
              <a
                href="/billing"
                className="font-medium text-yellow-700 underline hover:text-yellow-600"
              >
                Upgrade your plan
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}