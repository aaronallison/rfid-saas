'use client'

import { useState, useEffect } from 'react'
import { Plus, Bug, Search, AlertCircle, CheckCircle2, Clock, XCircle, Zap, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganization } from '@/contexts/org-context'
import { apiClient } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import type { Case } from '@/lib/api-client'

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [filteredCases, setFilteredCases] = useState<Case[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [caseType, setCaseType] = useState<'bug' | 'enhancement' | 'task'>('bug')
  const [severity, setSeverity] = useState('')
  const [area, setArea] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const { currentOrg } = useOrganization()

  const fetchCases = async () => {
    if (!currentOrg) return

    setIsLoading(true)
    try {
      const params: Record<string, string> = { limit: '100' }
      if (typeFilter !== 'all') params.case_type = typeFilter
      if (stageFilter !== 'all') params.stage = stageFilter

      const response = await apiClient.listTasks(currentOrg.id, params)
      setCases(response.data)
      setFilteredCases(response.data)
    } catch {
      setError('Failed to fetch cases')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrg) return

    setIsCreating(true)
    setError('')

    try {
      await apiClient.createTask(currentOrg.id, {
        title,
        description: description || undefined,
        case_type: caseType,
        severity: severity || undefined,
        area: area || undefined,
      })

      await fetchCases()
      setTitle('')
      setDescription('')
      setCaseType('bug')
      setSeverity('')
      setArea('')
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case')
    } finally {
      setIsCreating(false)
    }
  }

  // Client-side search filter
  useEffect(() => {
    let filtered = cases

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCases(filtered)
  }, [cases, searchTerm])

  useEffect(() => {
    fetchCases()
  }, [currentOrg, typeFilter, stageFilter])

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
      case 'change_review':
      case 'promote_beta':
        return 'bg-purple-100 text-purple-800'
      case 'close':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'needs_human':
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (sev: string | null) => {
    switch (sev) {
      case 'low':
        return 'text-green-600'
      case 'medium':
        return 'text-yellow-600'
      case 'high':
        return 'text-orange-600'
      case 'critical':
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
      case 'task':
        return <Wrench className="h-6 w-6 text-gray-500" />
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
            Bug reports, enhancements, and tasks for {currentOrg.name}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Case
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
          <option value="task">Tasks</option>
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
          <option value="execute">Executing</option>
          <option value="fix_review">Fix Review</option>
          <option value="policy_review">Policy Review</option>
          <option value="change_review">Change Review</option>
          <option value="promote_beta">Deploying</option>
          <option value="close">Closed</option>
        </Select>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Case</CardTitle>
            <CardDescription>
              Submit a bug report, enhancement, or task for the AI agents to process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCase} className="space-y-4">
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
                    minLength={3}
                  />
                </div>
                <div className="space-y-2 w-40">
                  <label htmlFor="type" className="text-sm font-medium">
                    Type
                  </label>
                  <Select
                    id="type"
                    value={caseType}
                    onChange={(e) => setCaseType(e.target.value as 'bug' | 'enhancement' | 'task')}
                  >
                    <option value="bug">Bug</option>
                    <option value="enhancement">Enhancement</option>
                    <option value="task">Task</option>
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
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label htmlFor="severity" className="text-sm font-medium">
                    Severity (optional)
                  </label>
                  <Select
                    id="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="">Select severity...</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <label htmlFor="area" className="text-sm font-medium">
                    Area (optional)
                  </label>
                  <Select
                    id="area"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                  >
                    <option value="">Select area...</option>
                    <option value="api">API / Backend</option>
                    <option value="dashboard">Dashboard / UI</option>
                    <option value="auth">Authentication</option>
                    <option value="billing">Billing</option>
                    <option value="database">Database</option>
                    <option value="mobile">Mobile</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Submitting...' : 'Submit Case'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setTitle('')
                    setDescription('')
                    setSeverity('')
                    setArea('')
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
      ) : filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {cases.length === 0 ? 'No cases yet' : 'No cases match your filters'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {cases.length === 0
                ? 'Submit a bug report or task to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {cases.length === 0 && (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Case
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCases.map((c) => (
            <Link key={c.case_id} href={`/cases/${c.case_id}`}>
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getTypeIcon(c.case_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{c.title}</CardTitle>
                        <CardDescription className="truncate">
                          {c.description?.slice(0, 80) || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStageColor(c.stage)}`}>
                      {c.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">{c.case_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(c.status)}
                        <span className="font-medium capitalize">{c.status.replace(/_/g, ' ')}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Severity</span>
                      <span className={`font-medium capitalize ${getSeverityColor(c.severity)}`}>
                        {c.severity || 'TBD'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">{formatDate(c.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
