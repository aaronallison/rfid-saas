'use client'

import { useState, useEffect } from 'react'
import { Plus, Bug, Search, AlertCircle, CheckCircle2, Clock, XCircle, Zap } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { createAgenticBrowserClient } from '@/lib/supabase-agentic'
import { formatDate } from '@/lib/utils'
import type { AgenticDatabase } from '@/lib/supabase-agentic'

type BugReport = AgenticDatabase['public']['Tables']['bug_reports']['Row']
type Case = AgenticDatabase['public']['Tables']['cases']['Row']

type BugWithCase = BugReport & {
  cases: Case[]
}

export default function CasesPage() {
  const [bugReports, setBugReports] = useState<BugWithCase[]>([])
  const [filteredReports, setFilteredReports] = useState<BugWithCase[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reportType, setReportType] = useState<'bug' | 'enhancement'>('bug')
  const [category, setCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const { currentOrg, user } = useOrganization()
  const agentic = createAgenticBrowserClient()

  const fetchBugReports = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    try {
      const { data, error } = await agentic
        .from('bug_reports')
        .select(`
          *,
          cases (*)
        `)
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setBugReports((data as BugWithCase[]) || [])
        setFilteredReports((data as BugWithCase[]) || [])
      }
    } catch {
      setError('Failed to fetch cases')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBugReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg || !user) return

    setIsCreating(true)
    setError('')

    try {
      // Create bug report
      const { data: bugReport, error: bugError } = await agentic
        .from('bug_reports')
        .insert({
          org_id: currentOrg.id,
          user_id: user.id,
          title,
          description,
          type: reportType,
          source: 'human' as const,
          category: category || null,
          trust_score: 3,
        })
        .select()
        .single()

      if (bugError) {
        setError(bugError.message)
        return
      }

      // Create case
      const { error: caseError } = await agentic
        .from('cases')
        .insert({
          org_id: currentOrg.id,
          bug_report_id: bugReport.id,
          trust_score: 3,
          stage: 'intake',
          status: 'active',
        })

      if (caseError) {
        setError(caseError.message)
        return
      }

      await fetchBugReports()
      setTitle('')
      setDescription('')
      setReportType('bug')
      setCategory('')
      setShowCreateForm(false)
    } catch {
      setError('Failed to create report')
    } finally {
      setIsCreating(false)
    }
  }

  // Filter reports
  useEffect(() => {
    let filtered = bugReports

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.type === typeFilter)
    }

    if (stageFilter !== 'all') {
      filtered = filtered.filter(report =>
        report.cases?.some(c => c.stage === stageFilter)
      )
    }

    setFilteredReports(filtered)
  }, [bugReports, searchTerm, typeFilter, stageFilter])

  useEffect(() => {
    fetchBugReports()
  }, [currentOrg])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'awaiting_approval':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case 'LOW':
        return 'text-green-600'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'HIGH':
        return 'text-orange-600'
      case 'CRITICAL':
        return 'text-red-600'
      default:
        return 'text-gray-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-6 w-6 text-red-500" />
      case 'enhancement':
        return <Zap className="h-6 w-6 text-blue-500" />
      case 'regression':
        return <AlertCircle className="h-6 w-6 text-orange-500" />
      default:
        return <Bug className="h-6 w-6 text-gray-500" />
    }
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
          <h1 className="text-3xl font-bold">Cases</h1>
          <p className="text-muted-foreground">
            Bug reports and enhancements for {currentOrg.name}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="sm:w-40"
        >
          <option value="all">All Types</option>
          <option value="bug">Bugs</option>
          <option value="enhancement">Enhancements</option>
          <option value="regression">Regressions</option>
        </Select>
        <Select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="sm:w-48"
        >
          <option value="all">All Stages</option>
          <option value="intake">Intake</option>
          <option value="triage">Triage</option>
          <option value="plan">Planning</option>
          <option value="plan_review">Plan Review</option>
          <option value="policy_review">Policy Review</option>
          <option value="approval_gate">Awaiting Approval</option>
          <option value="execute">Executing</option>
          <option value="change_review">Change Review</option>
          <option value="promote_beta">Deploying</option>
          <option value="complete">Complete</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Report an Issue</CardTitle>
            <CardDescription>
              Submit a bug report or enhancement request for the AI agents to process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateBugReport} className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label htmlFor="title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 w-40">
                  <label htmlFor="type" className="text-sm font-medium">
                    Type
                  </label>
                  <Select
                    id="type"
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as 'bug' | 'enhancement')}
                  >
                    <option value="bug">Bug</option>
                    <option value="enhancement">Enhancement</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  placeholder="Detailed description including steps to reproduce, expected behavior, and actual behavior"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium">
                  Category (optional)
                </label>
                <Select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select category...</option>
                  <option value="ui">UI / Frontend</option>
                  <option value="api">API / Backend</option>
                  <option value="database">Database</option>
                  <option value="auth">Authentication</option>
                  <option value="billing">Billing</option>
                  <option value="performance">Performance</option>
                  <option value="config">Configuration</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Submitting...' : 'Submit Report'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setTitle('')
                    setDescription('')
                    setCategory('')
                    setError('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cases List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading cases...</p>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {bugReports.length === 0 ? 'No cases yet' : 'No cases match your filters'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {bugReports.length === 0
                ? 'Submit a bug report or enhancement request to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {bugReports.length === 0 && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Report First Issue
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => {
            const caseData = report.cases?.[0]
            return (
              <Link key={report.id} href={`/cases/${report.id}`}>
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getTypeIcon(report.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">{report.title}</CardTitle>
                          <CardDescription className="truncate">
                            {report.description?.slice(0, 80) || 'No description'}
                          </CardDescription>
                        </div>
                      </div>
                      {caseData && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStageColor(caseData.stage)}`}>
                          {caseData.stage.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span className="font-medium capitalize">{report.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Source</span>
                        <span className="font-medium capitalize">{report.source}</span>
                      </div>
                      {caseData && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(caseData.status)}
                              <span className="font-medium capitalize">{caseData.status.replace(/_/g, ' ')}</span>
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Risk</span>
                            <span className={`font-medium ${getRiskColor(caseData.risk_level)}`}>
                              {caseData.risk_level || 'TBD'}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="font-medium">{formatDate(report.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
