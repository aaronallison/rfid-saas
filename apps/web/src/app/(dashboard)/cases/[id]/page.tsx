'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, Bug, Zap, Wrench, AlertCircle, CheckCircle2, XCircle, Clock,
  GitPullRequest, FileCode, Shield, ChevronDown, ChevronUp
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import type { Case, CaseEvent, Plan, Approval } from '@/lib/api-client'

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.id as string

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [events, setEvents] = useState<CaseEvent[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [showPlanDetails, setShowPlanDetails] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)

  const { currentOrg } = useOrganization()

  const fetchCaseData = async () => {
    if (!currentOrg || !caseId) return

    setIsLoading(true)
    try {
      const response = await apiClient.getTask(currentOrg.id, caseId)
      const detail = response.data
      setCaseData(detail)
      setEvents(detail.events || [])
      setPlans(detail.plans || [])
      setApprovals(detail.approvals || [])
    } catch {
      setError('Failed to load case data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCaseData()
  }, [currentOrg, caseId])

  // Auto-refresh every 15 seconds for active cases
  useEffect(() => {
    if (caseData && ['open', 'in_progress'].includes(caseData.status)) {
      const interval = setInterval(fetchCaseData, 15000)
      return () => clearInterval(interval)
    }
  }, [caseData?.status])

  const handleApprove = async () => {
    if (!caseData || !currentOrg) return
    setIsApproving(true)
    try {
      await apiClient.approveTask(currentOrg.id, caseData.case_id)
      await fetchCaseData()
    } catch {
      setError('Failed to approve')
    } finally {
      setIsApproving(false)
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'intake':
      case 'triage':
        return 'bg-blue-100 text-blue-800'
      case 'plan':
      case 'plan_review':
      case 'policy_review':
        return 'bg-yellow-100 text-yellow-800'
      case 'execute':
      case 'fix_review':
      case 'change_review':
      case 'promote_beta':
        return 'bg-purple-100 text-purple-800'
      case 'close':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'stage_enter':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'stage_exit':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'approval_request':
        return <Shield className="h-4 w-4 text-orange-500" />
      case 'approval_granted':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'approval_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'escalation':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-5 w-5 text-red-500" />
      case 'enhancement':
        return <Zap className="h-5 w-5 text-blue-500" />
      case 'task':
        return <Wrench className="h-5 w-5 text-gray-500" />
      default:
        return <Bug className="h-5 w-5 text-gray-500" />
    }
  }

  const getSeverityColor = (sev: string | null) => {
    switch (sev) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Please select an organization first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading case...</p>
        </CardContent>
      </Card>
    )
  }

  if (!caseData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Case not found</p>
          <Link href="/cases">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const latestPlan = plans[0]
  const pendingApproval = approvals.find(a => a.status === 'pending')

  // Pipeline progress stages
  const pipelineStages = [
    'intake', 'triage', 'plan', 'plan_review', 'execute',
    'fix_review', 'policy_review', 'change_review', 'promote_beta', 'close'
  ]
  const currentStageIndex = pipelineStages.indexOf(caseData.stage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {getTypeIcon(caseData.case_type)}
            <h1 className="text-2xl font-bold">{caseData.title}</h1>
            <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-primary/10 text-primary">
              {caseData.case_type}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(caseData.stage)}`}>
              {caseData.stage.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Created {formatDate(caseData.created_at)} &middot; Assigned to: {caseData.assigned_to}
          </p>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      {caseData.status !== 'failed' && caseData.status !== 'cancelled' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {pipelineStages.map((stage, index) => {
                const isCompleted = index < currentStageIndex
                const isCurrent = index === currentStageIndex
                return (
                  <div key={stage} className="flex items-center flex-shrink-0">
                    <div
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        isCompleted ? 'bg-green-100 text-green-800' :
                        isCurrent ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' :
                        'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {stage.replace(/_/g, ' ')}
                    </div>
                    {index < pipelineStages.length - 1 && (
                      <div className={`w-4 h-0.5 mx-0.5 ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{caseData.description || 'No description provided.'}</p>
              {caseData.area && (
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Area: </span>
                  <span className="text-sm font-medium capitalize">{caseData.area}</span>
                </div>
              )}
              {caseData.risk_flags && caseData.risk_flags.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground">Risk flags: </span>
                  {caseData.risk_flags.map((flag, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full mr-1">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval UI */}
          {caseData.status === 'needs_human' && pendingApproval && (
            <Card className="border-orange-300 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Approval Required
                </CardTitle>
                <CardDescription>
                  This case requires human approval before the AI agents proceed.
                  Gate: {pendingApproval.gate_type.replace(/_/g, ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isApproving ? 'Approving...' : 'Approve & Continue'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Latest Plan */}
          {latestPlan && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Plan v{latestPlan.version}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlanDetails(!showPlanDetails)}
                  >
                    {showPlanDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <CardDescription>
                  Status: {latestPlan.review_status} &middot;
                  Risk: {(latestPlan.risk_assessment as Record<string, string>)?.level || 'unknown'}
                </CardDescription>
              </CardHeader>
              {showPlanDetails && (
                <CardContent className="space-y-4">
                  {latestPlan.implementation && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Implementation Plan</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64">
                        {JSON.stringify(latestPlan.implementation, null, 2)}
                      </pre>
                    </div>
                  )}
                  {latestPlan.risk_assessment && Object.keys(latestPlan.risk_assessment).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Risk Assessment</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-32">
                        {JSON.stringify(latestPlan.risk_assessment, null, 2)}
                      </pre>
                    </div>
                  )}
                  {latestPlan.review_notes && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Review Notes</h4>
                      <p className="text-sm text-muted-foreground">{latestPlan.review_notes}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* PR / Branch info */}
          {(caseData.pr_url || caseData.branch_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5" />
                  Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseData.branch_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Branch</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{caseData.branch_name}</code>
                  </div>
                )}
                {caseData.pr_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pull Request</span>
                    <a
                      href={caseData.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View PR
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Case Info */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stage</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStageColor(caseData.stage)}`}>
                  {caseData.stage.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{caseData.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Severity</span>
                <span className={`font-medium capitalize ${getSeverityColor(caseData.severity)}`}>
                  {caseData.severity || 'TBD'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Area</span>
                <span className="font-medium capitalize">{caseData.area || 'TBD'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retries</span>
                <span className="font-medium">{caseData.retry_count}/{caseData.max_retries}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assigned</span>
                <span className="font-medium">{caseData.assigned_to}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Timeline</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTimeline(!showTimeline)}
                >
                  {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            {showTimeline && (
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet</p>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <div key={event.event_id} className="flex gap-3">
                        <div className="mt-0.5">{getEventIcon(event.event_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {event.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.actor} &middot; {event.stage} &middot; {formatDate(event.created_at)}
                          </p>
                          {event.summary && (
                            <p className="text-xs text-muted-foreground mt-1">{event.summary}</p>
                          )}
                          {event.details && Object.keys(event.details).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Details
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}
    </div>
  )
}
