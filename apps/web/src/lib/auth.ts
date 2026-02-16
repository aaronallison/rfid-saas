import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Validates user authentication and authorization for billing operations
 */
export async function validateUserAccess(request: NextRequest, org_id: string) {
  // Get the user from the session
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    console.error('Auth error:', userError)
    return { error: 'Invalid or expired token', status: 401 }
  }

  // Verify user has access to the organization
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', org_id)
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    console.error('Membership error:', membershipError)
    return { error: 'Organization access denied', status: 403 }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return { error: 'Insufficient permissions', status: 403 }
  }

  return { user, membership }
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}