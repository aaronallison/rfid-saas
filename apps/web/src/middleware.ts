import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for API routes, webhooks, and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') // static files with extensions
  ) {
    return NextResponse.next()
  }

  let response: NextResponse

  try {
    // Validate required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing required Supabase environment variables')
      return NextResponse.next()
    }

    // Create Supabase client with proper error handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Create response only when needed
            if (!response) {
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
            }
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // Create response only when needed
            if (!response) {
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
            }
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Get user with error handling
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Auth error in middleware:', error)
      // On auth error, redirect to login unless already there
      if (pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return response
    }

    // Handle authentication redirects with loop protection
    const isLoginPage = pathname === '/login'
    const isProtectedRoute = !isLoginPage

    // If user is not signed in and trying to access protected route
    if (!user && isProtectedRoute) {
      console.log('Redirecting unauthenticated user to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is signed in and on login page, redirect to orgs
    if (user && isLoginPage) {
      console.log('Redirecting authenticated user to orgs')
      return NextResponse.redirect(new URL('/orgs', request.url))
    }

    return response || NextResponse.next()
  } catch (error) {
    console.error('Unexpected error in middleware:', error)
    // On unexpected error, allow the request to proceed to avoid breaking the app
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static files with common extensions
     * - files with extensions (covers all static assets)
     */
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}