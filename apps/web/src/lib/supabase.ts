import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Server-side Supabase client for Server Components
export function createServerSupabaseClient(cookies: () => { get: (name: string) => { name: string; value: string } | undefined }) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookie = cookies().get(name)
          return cookie?.value
        },
      },
    }
  )
}

// Server-side Supabase client for Route Handlers
export function createRouteHandlerSupabaseClient(
  request: Request,
  response: Response
) {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.headers.get('cookie')
            ?.split('; ')
            ?.find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: CookieOptions) {
          response.headers.append('Set-Cookie', `${name}=${value}; Path=/; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} ${options.sameSite ? `SameSite=${options.sameSite};` : ''}`)
        },
        remove(name: string, options: CookieOptions) {
          response.headers.append('Set-Cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} ${options.sameSite ? `SameSite=${options.sameSite};` : ''}`)
        },
      },
    }
  )
}

// Default client for non-SSR contexts
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)