import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Supabase client configuration and factory functions
 * 
 * This module provides different Supabase client factories for various contexts:
 * - Browser/Client-side: createBrowserSupabaseClient()
 * - Server Components: createServerSupabaseClient()  
 * - Route Handlers: createRouteHandlerSupabaseClient()
 * - Admin operations: createServiceSupabaseClient()
 */

// Enums for better type safety
export type OrganizationRole = 'owner' | 'admin' | 'member'
export type BatchStatus = 'active' | 'completed' | 'archived'
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled'

// Types for our database
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          org_id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          org_id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          org_id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          member_id: string
          org_id: string
          user_id: string
          role: OrganizationRole
          invited_email: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          member_id?: string
          org_id: string
          user_id?: string
          role?: OrganizationRole
          invited_email?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          member_id?: string
          org_id?: string
          user_id?: string
          role?: OrganizationRole
          invited_email?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      batches: {
        Row: {
          batch_id: string
          org_id: string
          name: string
          description: string | null
          status: BatchStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          batch_id?: string
          org_id: string
          name: string
          description?: string | null
          status?: BatchStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          org_id?: string
          name?: string
          description?: string | null
          status?: BatchStatus
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      batch_schema: {
        Row: {
          schema_id: string
          batch_id: string
          org_id: string
          col_1_name: string | null
          col_2_name: string | null
          col_3_name: string | null
          col_4_name: string | null
          col_5_name: string | null
          col_6_name: string | null
          col_7_name: string | null
          col_8_name: string | null
          col_9_name: string | null
          col_10_name: string | null
          col_11_name: string | null
          col_12_name: string | null
          col_13_name: string | null
          col_14_name: string | null
          col_15_name: string | null
          col_16_name: string | null
          col_17_name: string | null
          col_18_name: string | null
          col_19_name: string | null
          col_20_name: string | null
          col_21_name: string | null
          col_22_name: string | null
          col_23_name: string | null
          col_24_name: string | null
          col_25_name: string | null
          created_at: string
        }
        Insert: {
          schema_id?: string
          batch_id: string
          org_id: string
          col_1_name?: string | null
          col_2_name?: string | null
          col_3_name?: string | null
          col_4_name?: string | null
          col_5_name?: string | null
          col_6_name?: string | null
          col_7_name?: string | null
          col_8_name?: string | null
          col_9_name?: string | null
          col_10_name?: string | null
          col_11_name?: string | null
          col_12_name?: string | null
          col_13_name?: string | null
          col_14_name?: string | null
          col_15_name?: string | null
          col_16_name?: string | null
          col_17_name?: string | null
          col_18_name?: string | null
          col_19_name?: string | null
          col_20_name?: string | null
          col_21_name?: string | null
          col_22_name?: string | null
          col_23_name?: string | null
          col_24_name?: string | null
          col_25_name?: string | null
          created_at?: string
        }
        Update: {
          schema_id?: string
          batch_id?: string
          org_id?: string
          col_1_name?: string | null
          col_2_name?: string | null
          col_3_name?: string | null
          col_4_name?: string | null
          col_5_name?: string | null
          col_6_name?: string | null
          col_7_name?: string | null
          col_8_name?: string | null
          col_9_name?: string | null
          col_10_name?: string | null
          col_11_name?: string | null
          col_12_name?: string | null
          col_13_name?: string | null
          col_14_name?: string | null
          col_15_name?: string | null
          col_16_name?: string | null
          col_17_name?: string | null
          col_18_name?: string | null
          col_19_name?: string | null
          col_20_name?: string | null
          col_21_name?: string | null
          col_22_name?: string | null
          col_23_name?: string | null
          col_24_name?: string | null
          col_25_name?: string | null
          created_at?: string
        }
      }
      captures: {
        Row: {
          capture_id: string
          batch_id: string
          rfid_tag: string
          field_data: Record<string, any>
          location: string | null
          captured_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          capture_id?: string
          batch_id: string
          rfid_tag: string
          field_data: Record<string, any>
          location?: string | null
          captured_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          capture_id?: string
          batch_id?: string
          rfid_tag?: string
          field_data?: Record<string, any>
          location?: string | null
          captured_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      billing_org: {
        Row: {
          org_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          billing_status: BillingStatus | null
          updated_at: string
        }
        Insert: {
          org_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_status?: BillingStatus | null
          updated_at?: string
        }
        Update: {
          org_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_status?: BillingStatus | null
          updated_at?: string
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

// Environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables')
}

/**
 * Creates a Supabase client for browser/client-side use.
 * Handles auth state automatically and is safe for client-side rendering.
 * 
 * @returns Typed Supabase client for browser use
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}

/**
 * Creates a Supabase client for Server Components.
 * Must be passed the cookies function from Next.js.
 * 
 * @param cookies - The cookies function from next/headers
 * @returns Typed Supabase client for server components
 * 
 * @example
 * ```typescript
 * import { cookies } from 'next/headers'
 * 
 * const supabase = createServerSupabaseClient(cookies)
 * const { data: user } = await supabase.auth.getUser()
 * ```
 */
export function createServerSupabaseClient(cookies: () => { get: (name: string) => { name: string; value: string } | undefined }) {
  return createServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookies().get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Server Components are read-only, so we can't set cookies
          // This is handled by middleware or client-side code
        },
        remove(name: string, options: CookieOptions) {
          // Server Components are read-only, so we can't remove cookies
          // This is handled by middleware or client-side code
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for Route Handlers.
 * Extracts cookies from the request headers.
 * 
 * @param request - The incoming Request object
 * @returns Typed Supabase client for route handlers
 * 
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const supabase = createRouteHandlerSupabaseClient(request)
 *   const { data: user } = await supabase.auth.getUser()
 *   return NextResponse.json({ user })
 * }
 * ```
 */
export function createRouteHandlerSupabaseClient(request: Request) {
  return createServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          const cookieHeader = request.headers.get('cookie')
          if (!cookieHeader) return undefined
          
          const cookies = cookieHeader.split('; ')
          const cookie = cookies.find(c => c.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined
        },
        set(name: string, value: string, options: CookieOptions) {
          // Route handlers should return a Response with set cookies
          // This will be handled by the calling route handler
        },
        remove(name: string, options: CookieOptions) {
          // Route handlers should return a Response with removed cookies
          // This will be handled by the calling route handler
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for Route Handlers that need to set/remove cookies.
 * Returns both the client and headers to be used in the response.
 * 
 * @returns Object with supabase client and headers
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const { supabase, headers } = createRouteHandlerSupabaseClientWithResponse()
 *   await supabase.auth.signOut()
 *   return NextResponse.json({ success: true }, { headers })
 * }
 * ```
 */
export function createRouteHandlerSupabaseClientWithResponse() {
  const headers = new Headers()
  
  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          // This will be called during the request, cookies should be passed in
          return undefined
        },
        set(name: string, value: string, options: CookieOptions) {
          const cookieString = `${name}=${value}; Path=${options.path || '/'}${
            options.httpOnly ? '; HttpOnly' : ''
          }${options.secure ? '; Secure' : ''}${
            options.sameSite ? `; SameSite=${options.sameSite}` : ''
          }${options.maxAge ? `; Max-Age=${options.maxAge}` : ''}`
          
          headers.append('Set-Cookie', cookieString)
        },
        remove(name: string, options: CookieOptions) {
          const cookieString = `${name}=; Path=${options.path || '/'}; Expires=Thu, 01 Jan 1970 00:00:00 GMT${
            options.httpOnly ? '; HttpOnly' : ''
          }${options.secure ? '; Secure' : ''}${
            options.sameSite ? `; SameSite=${options.sameSite}` : ''
          }`
          
          headers.append('Set-Cookie', cookieString)
        },
      },
    }
  )
  
  return { supabase, headers }
}

/**
 * Creates a Supabase client with service role privileges.
 * This bypasses RLS policies and should only be used server-side for admin operations.
 * 
 * @returns Supabase client with service role privileges
 * @throws Error if SUPABASE_SERVICE_ROLE_KEY is not set
 * 
 * @example
 * ```typescript
 * // In a webhook or admin API route
 * const supabase = createServiceSupabaseClient()
 * await supabase.from('users').update({ role: 'admin' }).eq('id', userId)
 * ```
 */
export function createServiceSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  
  return createClient<Database>(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Type helpers for better TypeScript inference
 */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Type aliases for common table types
export type Organization = Tables<'organizations'>
export type OrganizationMember = Tables<'organization_members'>
export type Batch = Tables<'batches'>
export type BatchSchema = Tables<'batch_schema'>
export type Capture = Tables<'captures'>
export type BillingOrg = Tables<'billing_org'>

/**
 * @deprecated Use createBrowserSupabaseClient() instead for better SSR support
 */
export const supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!)