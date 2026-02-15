# Middleware Documentation

## Overview

This Next.js middleware handles authentication and routing for the web application. It uses Supabase for authentication and implements automatic redirects based on user authentication status.

## Functionality

### Authentication Check
- Retrieves the current user session from Supabase using server-side cookies
- Handles cookie management for authentication state persistence

### Route Protection
The middleware implements the following routing logic:

1. **Unauthenticated Users**: 
   - If user is not signed in and trying to access any route except `/login`
   - Automatically redirects to `/login` page

2. **Authenticated Users**:
   - If user is signed in and trying to access `/login`
   - Automatically redirects to `/orgs` page (main dashboard)

### Cookie Management
- Uses Supabase SSR client for secure cookie handling
- Manages authentication cookies across requests
- Implements proper cookie setting and removal for session management

## Configuration

### Matcher Pattern
The middleware runs on all routes except:
- `_next/static/*` - Next.js static files
- `_next/image/*` - Next.js image optimization files  
- `favicon.ico` - Favicon file
- Static assets with extensions: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Implementation Details

### Server Client Setup
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        // Updates both request and response cookies
      },
      remove(name: string, options: CookieOptions) {
        // Removes cookies from both request and response
      },
    }
  }
)
```

### Authentication Flow
1. Extract user session from cookies
2. Check authentication status
3. Apply routing rules based on current path and auth status
4. Return appropriate response (redirect or continue)

## Security Considerations

- Uses secure server-side cookie handling
- Implements proper authentication state management
- Protects routes from unauthorized access
- Handles cookie cleanup on sign out

## Maintenance Notes

- Monitor performance impact on all routes
- Update matcher pattern if new static file types are added
- Ensure environment variables are properly configured in deployment
- Consider adding rate limiting for authentication endpoints if needed