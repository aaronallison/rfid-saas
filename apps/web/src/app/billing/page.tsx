'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BillingStatus } from '@/lib/billing'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Mock org ID for demo purposes
  const orgId = 'org_1'

  useEffect(() => {
    fetchBillingStatus()
  }, [])

  const fetchBillingStatus = async () => {
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

  const handleSubscribe = async () => {
    setActionLoading('subscribe')
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        alert('Failed to create checkout session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error creating checkout session')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setActionLoading('manage')
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        alert('Failed to create portal session')
      }
    } catch (error) {
      console.error('Error creating portal session:', error)
      alert('Error creating portal session')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading billing status...</div>
      </div>
    )
  }

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

            {/* Success/Cancel Messages */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Subscription successful!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your subscription has been activated. You now have access to all premium features.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {canceled && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Subscription canceled
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Your subscription setup was canceled. You can try again anytime.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Status */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full ${billingStatus?.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {billingStatus?.isActive ? 'Active' : 'Inactive'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full ${billingStatus?.canSync ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Sync</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {billingStatus?.canSync ? 'Enabled' : 'Disabled'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full ${billingStatus?.canExport ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Export</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {billingStatus?.canExport ? 'Enabled' : 'Disabled'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Team Size</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {billingStatus?.currentTeamSize} / {billingStatus?.maxTeamSize === Infinity ? '∞' : billingStatus?.maxTeamSize}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            {billingStatus?.isActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Subscription Details</h3>
                <p className="text-sm text-blue-700">
                  Status: {billingStatus.subscriptionStatus}
                  {billingStatus.currentPeriodEnd && (
                    <span> | Renews: {billingStatus.currentPeriodEnd.toLocaleDateString()}</span>
                  )}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              {!billingStatus?.isActive ? (
                <button
                  onClick={handleSubscribe}
                  disabled={actionLoading === 'subscribe'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
                >
                  {actionLoading === 'subscribe' ? 'Loading...' : 'Subscribe Now'}
                </button>
              ) : (
                <button
                  onClick={handleManageBilling}
                  disabled={actionLoading === 'manage'}
                  className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
                >
                  {actionLoading === 'manage' ? 'Loading...' : 'Manage Billing'}
                </button>
              )}
            </div>

            {/* Feature Information */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">What's Included</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${billingStatus?.canSync ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">RFID Data Sync</h4>
                    <p className="text-sm text-gray-500">Real-time synchronization of RFID field data</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${billingStatus?.canExport ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Data Export</h4>
                    <p className="text-sm text-gray-500">Export your data in multiple formats</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${billingStatus?.maxTeamSize > 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Team Collaboration</h4>
                    <p className="text-sm text-gray-500">Up to {billingStatus?.maxTeamSize === Infinity ? 'unlimited' : billingStatus?.maxTeamSize} team members</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 mt-0.5"></div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">24/7 Support</h4>
                    <p className="text-sm text-gray-500">Priority customer support</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}