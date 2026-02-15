import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

// Create service client for server-side operations
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface AuthenticatedUser {
  id: string
  email: string | undefined
}

export interface AuthenticationResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  status?: number
}

/**
 * Authenticate user from request authorization header
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticationResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No authorization header or invalid format',
        status: 401
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createServiceClient()
    
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    }
  }
}

export interface AuthorizationResult {
  success: boolean
  membership?: {
    role: 'owner' | 'admin' | 'member'
  }
  error?: string
  status?: number
}

/**
 * Check if user has admin/owner access to organization
 */
export async function checkOrganizationAccess(
  userId: string, 
  orgId: string, 
  requiredRoles: ('owner' | 'admin' | 'member')[] = ['owner', 'admin']
): Promise<AuthorizationResult> {
  try {
    const supabase = createServiceClient()
    
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single()

    if (error || !membership) {
      return {
        success: false,
        error: 'Organization not found or access denied',
        status: 404
      }
    }

    if (!requiredRoles.includes(membership.role)) {
      return {
        success: false,
        error: 'Insufficient permissions',
        status: 403
      }
    }

    return {
      success: true,
      membership
    }
  } catch (error) {
    console.error('Authorization error:', error)
    return {
      success: false,
      error: 'Authorization check failed',
      status: 500
    }
  }
}

/**
 * Combined authentication and authorization check
 */
export async function authenticateAndAuthorize(
  request: NextRequest,
  orgId: string,
  requiredRoles: ('owner' | 'admin' | 'member')[] = ['owner', 'admin']
): Promise<{
  success: boolean
  user?: AuthenticatedUser
  membership?: { role: 'owner' | 'admin' | 'member' }
  error?: string
  status?: number
}> {
  // First authenticate
  const authResult = await authenticateUser(request)
  if (!authResult.success) {
    return authResult
  }

  // Then authorize
  const authzResult = await checkOrganizationAccess(authResult.user!.id, orgId, requiredRoles)
  if (!authzResult.success) {
    return authzResult
  }

  return {
    success: true,
    user: authResult.user,
    membership: authzResult.membership
  }
}