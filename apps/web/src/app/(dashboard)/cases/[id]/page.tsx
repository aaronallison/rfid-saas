'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Bug, Zap, AlertCircle, CheckCircle2, XCircle, Clock,
  GitPullRequest, FileCode, Shield, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createAgenticBrowserClient } from '@/lib/supabase-agentic'
import { formatDate } from '@/lib/utils'
import type { AgenticDatabase } from '@/lib/supabase-agentic'

type BugReport = AgenticDatabase['public']['Tables']['bug_reports']['Row']
type Case = AgenticDatabase['public']['Tables']['cases']['Row']
type CaseEvent = AgenticDatabase['public']['Tables']['case_events']['Row']
type Plan = AgenticDatabase['public']['Tables']['plans']['Row']
type Execution = AgenticDatabase['public']['Tables']['executions']['Row']

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bugReportId = params.id as string

  const [bugReport, setBugReport] = useState<BugReport | null>(null)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [events, setEvents] = useState<CaseEvent[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showPlanDetails, setShowPlanDetails] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)

  const { currentOrg } = useOrganization()
  const agentic = createAgenticBrowserClient()

  const fetchCaseData = async () => {
    if (!currentOrg || !bugReportId) return

    setIsLoading(true)
    try {
      // Fetch bug report
      const { data: bug, error: bugError } = await agentic
        .from('bug_reports')
        .select('*')
        .eq('id', bugReportId)
        .eq('org_id', currentOrg.id)
        .single()

      if (bugError || !bug) {
        setError('Bug report not found')
        return
      }
      setBugReport(bug)

      // Fetch case
      const { data: cases } = await agentic
        .from('cases')
        .select('*')
        .eq('bug_report_id', bugReportId)
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const currentCase = cases?.[0] || null
      setCaseData(currentCase)

      if (currentCase) {
        // Fetch timeline events
        const { data: eventData } = await agentic
          .from('case_events')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('created_at', { ascending: true })

        setEvents(eventData || [])

        // Fetch plans
        const { data: planData } = await agentic
          .from('plans')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('version', { ascending: false })

        setPlans(planData || [])

        // Fetch executions
        const { data: execData } = await agentic
          .from('executions')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('created_at', { ascending: false })

        setExecutions(execData || [])
      }
    } catch {
      setError('Failed to load case data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCaseData()
  }, [currentOrg, bugReportId])

  // Auto-refresh every 15 seconds for active cases
  useEffect(() => {
    if (caseData && ['active', 'awaiting_approval'].includes(caseData.status)) {
      const interval = setInterval(fetchCaseData, 15000)
      return () => clearInterval(interval)
    }
  }, [caseData?.status])

  const handleApprove = async () => {
    if (!caseData) return
    setIsApproving(true)
    try {
      await agentic
        .from('cases')
        .update({ status: 'active', stage: 'execute' })
        .eq('id', caseData.id)

      await agentic
        .from('case_events')
        .insert({
          case_id: caseData.id,
          stage: 'approval_gate',
          actor: 'human',
          event_type: 'human_approved',
          payload: { feedback: approvalFeedback }
        })

      setApprovalFeedback('')
      await fetchCaseData()
    } catch {
      setError('Failed to approve')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!caseData || !rejectReason) return
    setIsRejecting(true)
    try {
      await agentic
        .from('cases')
        .update({ status: 'active', stage: 'plan' })
        .eq('id', caseData.id)

      await agentic
        .from('case_events')
        .insert({
          case_id: caseData.id,
          stage: 'approval_gate',
          actor: 'human',
          event_type: 'human_rejected',
          payload: { reason: rejectReason }
        })

      setRejectReason('')
      await fetchCaseData()
    } catch {
      setError('Failed to reject')
    } finally {
      setIsRejecting(false)
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
      case 'approval_gate':
        return 'bg-orange-100 text-orange-800'
      case 'execute':
      case 'change_review':
      case 'promote_beta':
        return 'bg-purple-100 text-purple-800'
      case 'complete':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'case_created':
        return <Bug className="h-4 w-4 text-blue-500" />
      case 'stage_transition':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'intake_completed':
      case 'triage_completed':
      case 'plan_created':
      case 'review_completed':
      case 'policy_review_completed':
      case 'execution_completed':
      case 'change_review_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'human_approved':
      case 'autopass_check':
        return <Shield className="h-4 w-4 text-green-500" />
      case 'human_rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pr_merged':
        return <GitPullRequest className="h-4 w-4 text-purple-500" />
      case 'case_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'case_failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'rollback_initiated':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
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

  if (!bugReport) {
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
  const latestExecution = executions[0]

  // Pipeline progress stages
  const pipelineStages = [
    'intake', 'triage', 'plan', 'plan_review', 'policy_review',
    'approval_gate', 'execute', 'change_review', 'promote_beta', 'complete'
  ]
  const currentStageIndex = caseData ? pipelineStages.indexOf(caseData.stage) : -1

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
            <h1 className="text-2xl font-bold">{bugReport.title}</h1>
            <span className="px-2 py-1 text-xs font-medium rounded-full capitalize bg-primary/10 text-primary">
              {bugReport.type}
            </span>
            {caseData && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(caseData.stage)}`}>
                {caseData.stage.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Reported {formatDate(bugReport.created_at)} &middot; Source: {bugReport.source} &middot; Trust: {bugReport.trust_score}/5
          </p>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      {caseData && caseData.stage !== 'failed' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {pipelineStages.map((stage, index) => {
                const isCompleted = index < currentStageIndex
                const isCurrent = index === currentStageIndex
                const isFuture = index > currentStageIndex
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
              <p className="text-sm whitespace-pre-wrap">{bugReport.description}</p>
              {bugReport.category && (
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Category: </span>
                  <span className="text-sm font-medium capitalize">{bugReport.category}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval UI - shown when case is at approval_gate */}
          {caseData?.stage === 'approval_gate' && caseData?.status === 'awaiting_approval' && (
            <Card className="border-orange-300 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Approval Required
                </CardTitle>
                <CardDescription>
                  This case requires human approval before the AI agents proceed with execution.
                  Review the plan below and approve or reject with feedback.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <textarea
                      placeholder="Approval feedback (optional)"
                      value={approvalFeedback}
                      onChange={(e) => setApprovalFeedback(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button onClick={handleApprove} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isApproving ? 'Approving...' : 'Approve & Execute'}
                    </Button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <textarea
                      placeholder="Rejection reason (required)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      onClick={handleReject}
                      disabled={isRejecting || !rejectReason}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isRejecting ? 'Rejecting...' : 'Reject & Revise'}
                    </Button>
                  </div>
                </div>
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
                {latestPlan.summary && (
                  <CardDescription>{latestPlan.summary}</CardDescription>
                )}
              </CardHeader>
              {showPlanDetails && (
                <CardContent className="space-y-4">
                  {latestPlan.root_cause && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Root Cause</h4>
                      <p className="text-sm text-muted-foreground">{latestPlan.root_cause}</p>
                    </div>
                  )}
                  {latestPlan.files_to_touch?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Files to Touch</h4>
                      <div className="space-y-1">
                        {latestPlan.files_to_touch.map((file, i) => (
                          <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">{file}</code>
                        ))}
                      </div>
                    </div>
                  )}
                  {latestPlan.risk_level && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Risk Level</h4>
                      <span className={`text-sm font-medium ${
                        latestPlan.risk_level === 'LOW' ? 'text-green-600' :
                        latestPlan.risk_level === 'MEDIUM' ? 'text-yellow-600' :
                        latestPlan.risk_level === 'HIGH' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {latestPlan.risk_level}
                      </span>
                    </div>
                  )}
                  {latestPlan.rollback_plan && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Rollback Plan</h4>
                      <p className="text-sm text-muted-foreground">{latestPlan.rollback_plan}</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Execution / PR */}
          {latestExecution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5" />
                  Execution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestExecution.pr_url && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pull Request</span>
                    <a
                      href={latestExecution.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      PR #{latestExecution.pr_number}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {latestExecution.branch && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Branch</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{latestExecution.branch}</code>
                  </div>
                )}
                {latestExecution.ci_status && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CI Status</span>
                    <span className={`text-sm font-medium ${
                      latestExecution.ci_status === 'success' ? 'text-green-600' :
                      latestExecution.ci_status === 'failure' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {latestExecution.ci_status}
                    </span>
                  </div>
                )}
                {latestExecution.deployment_status && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Deployment</span>
                    <span className={`text-sm font-medium ${
                      latestExecution.deployment_status === 'deployed' ? 'text-green-600' :
                      latestExecution.deployment_status === 'failed' ? 'text-red-600' :
                      latestExecution.deployment_status === 'rolled_back' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {latestExecution.deployment_status}
                    </span>
                  </div>
                )}
                {latestExecution.changed_files?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Changed Files</span>
                    <div className="mt-1 space-y-1">
                      {latestExecution.changed_files.map((file, i) => (
                        <code key={i} className="block text-xs bg-muted px-2 py-1 rounded">{file}</code>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Case Info + Timeline */}
        <div className="space-y-6">
          {/* Case Info */}
          {caseData && (
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
                  <span className="text-muted-foreground">Risk</span>
                  <span className={`font-medium ${
                    caseData.risk_level === 'LOW' ? 'text-green-600' :
                    caseData.risk_level === 'MEDIUM' ? 'text-yellow-600' :
                    caseData.risk_level === 'HIGH' ? 'text-orange-600' :
                    caseData.risk_level === 'CRITICAL' ? 'text-red-600' :
                    'text-gray-400'
                  }`}>
                    {caseData.risk_level || 'TBD'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trust Score</span>
                  <span className="font-medium">{caseData.trust_score}/5</span>
                </div>
                {caseData.repro_confidence !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Repro Confidence</span>
                    <span className="font-medium">{(caseData.repro_confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan Loops</span>
                  <span className="font-medium">{caseData.plan_review_loops}/3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Execute Retries</span>
                  <span className="font-medium">{caseData.execute_retries}/2</span>
                </div>
              </CardContent>
            </Card>
          )}

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
                      <div key={event.id} className="flex gap-3">
                        <div className="mt-0.5">{getEventIcon(event.event_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {event.event_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.actor} &middot; {event.stage} &middot; {formatDate(event.created_at)}
                          </p>
                          {event.payload && Object.keys(event.payload).length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                Details
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">
                                {JSON.stringify(event.payload, null, 2)}
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
