import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuthenticatedUser {
  user_id: string
  email: string
}

export interface AuthError {
  error: string
  status: number
}

/**
 * Authenticate user from Authorization header
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | AuthError> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return { error: 'Invalid authorization header format', status: 401 }
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  return {
    user_id: user.id,
    email: user.email || ''
  }
}

/**
 * Check if user has required permissions for organization
 */
export async function checkOrgPermission(
  user_id: string,
  org_id: string,
  requiredRoles: ('owner' | 'admin' | 'member')[] = ['owner', 'admin']
): Promise<{ hasPermission: boolean; role?: string; error?: string }> {
  try {
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', org_id)
      .eq('user_id', user_id)
      .single()

    if (membershipError) {
      return { hasPermission: false, error: 'Organization membership not found' }
    }

    if (!membership || !requiredRoles.includes(membership.role)) {
      return { hasPermission: false, error: 'Insufficient permissions' }
    }

    return { hasPermission: true, role: membership.role }
  } catch (error) {
    console.error('Error checking org permission:', error)
    return { hasPermission: false, error: 'Failed to check permissions' }
  }
}

/**
 * Validate organization ID format
 */
export function validateOrgId(org_id: unknown): org_id is string {
  return typeof org_id === 'string' && 
         org_id.length > 0 && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(org_id)
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message: string, status: number = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}