import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Types for our database
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          invited_email: string | null
          invited_at: string | null
          joined_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          invited_email?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          invited_email?: string | null
          invited_at?: string | null
          joined_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      batches: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      captures: {
        Row: {
          id: string
          batch_id: string
          rfid_tag: string
          field_data: Record<string, any>
          location: string | null
          captured_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          rfid_tag: string
          field_data: Record<string, any>
          location?: string | null
          captured_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
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
          billing_status: 'trialing' | 'active' | 'past_due' | 'canceled' | null
          updated_at: string
        }
        Insert: {
          org_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | null
          updated_at?: string
        }
        Update: {
          org_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          billing_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | null
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

// Environment variable validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side Supabase client
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client for Server Components
export function createServerSupabaseClient(
  cookieStore: ReturnType<typeof cookies>
) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Server-side Supabase client for Route Handlers (App Router)
export function createRouteHandlerSupabaseClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Legacy Route Handler client for compatibility with Request/Response pattern
export function createLegacyRouteHandlerSupabaseClient(
  request: Request
) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookieHeader = request.headers.get('cookie')
          if (!cookieHeader) return undefined
          
          const cookies = cookieHeader.split('; ')
          const cookie = cookies.find(row => row.startsWith(`${name}=`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : undefined
        },
        set() {
          // Cannot set cookies in this pattern - should use middleware or new pattern
        },
        remove() {
          // Cannot remove cookies in this pattern - should use middleware or new pattern
        },
      },
    }
  )
}

// Service role client for server-side operations with elevated permissions
export function createServiceRoleSupabaseClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Default client for non-SSR contexts (use sparingly - prefer the specific clients above)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Utility function to get user server-side
export async function getCurrentUser(cookieStore: ReturnType<typeof cookies>) {
  const supabase = createServerSupabaseClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  
  return { user, error }
}

// Type exports for convenience
export type { Database }
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']