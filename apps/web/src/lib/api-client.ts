import { createBrowserSupabaseClient } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Types matching the Express API's grotap schema
export interface Case {
  case_id: string
  org_id: string
  title: string
  description: string | null
  case_type: 'bug' | 'enhancement' | 'task'
  severity: 'critical' | 'high' | 'medium' | 'low' | null
  area: string | null
  stage: 'intake' | 'triage' | 'plan' | 'plan_review' | 'execute' | 'fix_review' | 'policy_review' | 'change_review' | 'promote_beta' | 'close'
  status: 'open' | 'in_progress' | 'blocked' | 'needs_human' | 'completed' | 'failed' | 'cancelled'
  risk_flags: string[]
  metadata: Record<string, unknown>
  branch_name: string | null
  pr_url: string | null
  submitted_by: string | null
  assigned_to: string
  retry_count: number
  max_retries: number
  created_at: string
  updated_at: string
}

export interface CaseEvent {
  event_id: string
  case_id: string
  org_id: string
  stage: string
  event_type: string
  actor: string
  summary: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface Plan {
  plan_id: string
  case_id: string
  org_id: string
  version: number
  implementation: Record<string, unknown>
  risk_assessment: Record<string, unknown>
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  review_notes: string | null
  reviewed_by: string | null
  created_at: string
}

export interface Approval {
  approval_id: string
  case_id: string
  org_id: string
  stage: string
  gate_type: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  decided_at: string | null
  decided_by: string | null
  reason: string | null
  created_at: string
}

export interface CaseDetail extends Case {
  events: CaseEvent[]
  plans: Plan[]
  approvals: Approval[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

class ApiClient {
  private async getAuthHeaders(orgId: string): Promise<Record<string, string>> {
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-org-id': orgId,
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    return headers
  }

  private async request<T>(
    method: string,
    path: string,
    orgId: string,
    body?: unknown,
  ): Promise<T> {
    const headers = await this.getAuthHeaders(orgId)
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(error.error || `API error: ${res.status}`)
    }

    return res.json()
  }

  // Tasks (Cases)
  async listTasks(
    orgId: string,
    params?: { stage?: string; status?: string; case_type?: string; page?: number; limit?: number },
  ): Promise<PaginatedResponse<Case>> {
    const query = new URLSearchParams()
    if (params?.stage) query.set('stage', params.stage)
    if (params?.status) query.set('status', params.status)
    if (params?.case_type) query.set('case_type', params.case_type)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))
    const qs = query.toString()
    return this.request('GET', `/api/tasks${qs ? `?${qs}` : ''}`, orgId)
  }

  async getTask(orgId: string, caseId: string): Promise<{ data: CaseDetail }> {
    return this.request('GET', `/api/tasks/${caseId}`, orgId)
  }

  async createTask(
    orgId: string,
    data: { title: string; description?: string; case_type: 'bug' | 'enhancement' | 'task'; severity?: string; area?: string },
  ): Promise<{ data: Case }> {
    return this.request('POST', '/api/tasks', orgId, data)
  }

  async approveTask(orgId: string, caseId: string): Promise<{ data: Case }> {
    return this.request('POST', `/api/tasks/${caseId}/approve`, orgId)
  }
}

export const apiClient = new ApiClient()
