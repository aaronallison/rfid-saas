import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Types for the agentic database
export interface AgenticDatabase {
  public: {
    Tables: {
      bug_reports: {
        Row: {
          id: string
          org_id: string
          user_id: string | null
          title: string
          description: string
          type: 'bug' | 'enhancement' | 'regression'
          trust_score: number
          attachments: any[]
          source: 'human' | 'agent'
          status: 'open' | 'in_progress' | 'resolved' | 'closed'
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id?: string | null
          title: string
          description: string
          type?: 'bug' | 'enhancement' | 'regression'
          trust_score?: number
          attachments?: any[]
          source?: 'human' | 'agent'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string | null
          title?: string
          description?: string
          type?: 'bug' | 'enhancement' | 'regression'
          trust_score?: number
          attachments?: any[]
          source?: 'human' | 'agent'
          status?: 'open' | 'in_progress' | 'resolved' | 'closed'
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          org_id: string
          bug_report_id: string
          stage: 'intake' | 'triage' | 'plan' | 'plan_review' | 'policy_review' | 'approval_gate' | 'execute' | 'change_review' | 'promote_beta' | 'complete' | 'failed'
          status: 'active' | 'awaiting_approval' | 'complete' | 'failed' | 'cancelled'
          risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
          repro_confidence: number | null
          current_plan_id: string | null
          trust_score: number
          plan_review_loops: number
          execute_retries: number
          assigned_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          bug_report_id: string
          stage?: string
          status?: string
          risk_level?: string | null
          repro_confidence?: number | null
          current_plan_id?: string | null
          trust_score?: number
          plan_review_loops?: number
          execute_retries?: number
          assigned_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          bug_report_id?: string
          stage?: string
          status?: string
          risk_level?: string | null
          repro_confidence?: number | null
          current_plan_id?: string | null
          trust_score?: number
          plan_review_loops?: number
          execute_retries?: number
          assigned_agent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      case_events: {
        Row: {
          id: string
          case_id: string
          stage: string
          actor: string
          event_type: string
          payload: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          stage: string
          actor: string
          event_type: string
          payload?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          stage?: string
          actor?: string
          event_type?: string
          payload?: Record<string, any>
          created_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          case_id: string
          version: number
          plan_json: Record<string, any>
          acceptance_tests: any[]
          risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
          summary: string | null
          root_cause: string | null
          files_to_touch: string[]
          rollback_plan: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          version?: number
          plan_json: Record<string, any>
          acceptance_tests?: any[]
          risk_level?: string | null
          summary?: string | null
          root_cause?: string | null
          files_to_touch?: string[]
          rollback_plan?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          version?: number
          plan_json?: Record<string, any>
          acceptance_tests?: any[]
          risk_level?: string | null
          summary?: string | null
          root_cause?: string | null
          files_to_touch?: string[]
          rollback_plan?: string | null
          created_at?: string
        }
      }
      executions: {
        Row: {
          id: string
          case_id: string
          plan_id: string
          pr_url: string | null
          pr_number: number | null
          branch: string | null
          changed_files: string[]
          test_results: Record<string, any>
          ci_status: 'pending' | 'running' | 'success' | 'failure' | null
          deployment_status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back' | null
          smoke_results: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          plan_id: string
          pr_url?: string | null
          pr_number?: number | null
          branch?: string | null
          changed_files?: string[]
          test_results?: Record<string, any>
          ci_status?: string | null
          deployment_status?: string | null
          smoke_results?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          plan_id?: string
          pr_url?: string | null
          pr_number?: number | null
          branch?: string | null
          changed_files?: string[]
          test_results?: Record<string, any>
          ci_status?: string | null
          deployment_status?: string | null
          smoke_results?: Record<string, any> | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

const agenticUrl = process.env.NEXT_PUBLIC_AGENTIC_SUPABASE_URL!
const agenticAnonKey = process.env.NEXT_PUBLIC_AGENTIC_SUPABASE_ANON_KEY!

// Client-side Supabase client for agentic database
export function createAgenticBrowserClient() {
  return createBrowserClient<AgenticDatabase>(agenticUrl, agenticAnonKey)
}

// Default client for non-SSR contexts
export const agenticSupabase = createClient<AgenticDatabase>(agenticUrl, agenticAnonKey)
