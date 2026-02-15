import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}))

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }
})

afterEach(() => {
  process.env = originalEnv
  jest.clearAllMocks()
})

describe('middleware', () => {
  const createMockRequest = (pathname: string, cookies: Record<string, string> = {}) => {
    const request = {
      nextUrl: { pathname },
      url: `https://example.com${pathname}`,
      headers: new Headers(),
      cookies: {
        get: jest.fn((name: string) => cookies[name] ? { value: cookies[name] } : undefined),
        set: jest.fn(),
      },
    } as unknown as NextRequest

    return request
  }

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
        },
      })
    })

    it('should redirect to login when accessing protected routes', async () => {
      const request = createMockRequest('/orgs')
      const response = await middleware(request)

      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toBe('https://example.com/login')
    })

    it('should allow access to login page', async () => {
      const request = createMockRequest('/login')
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should redirect dashboard routes to login', async () => {
      const request = createMockRequest('/batches')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('https://example.com/login')
    })
  })

  describe('when user is authenticated', () => {
    beforeEach(() => {
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@example.com' } }
          }),
        },
      })
    })

    it('should redirect from login to orgs when authenticated', async () => {
      const request = createMockRequest('/login')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('https://example.com/orgs')
    })

    it('should allow access to protected routes', async () => {
      const request = createMockRequest('/orgs')
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should allow access to dashboard routes', async () => {
      const request = createMockRequest('/batches')
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })
  })

  describe('cookie handling', () => {
    it('should handle cookie operations correctly', async () => {
      const { createServerClient } = require('@supabase/ssr')
      const mockGet = jest.fn()
      const mockSet = jest.fn()
      const mockRemove = jest.fn()

      createServerClient.mockImplementation((url, key, options) => {
        // Simulate cookie operations
        if (options.cookies.get) {
          mockGet.mockImplementation(options.cookies.get)
        }
        if (options.cookies.set) {
          mockSet.mockImplementation(options.cookies.set)
        }
        if (options.cookies.remove) {
          mockRemove.mockImplementation(options.cookies.remove)
        }

        return {
          auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
          },
        }
      })

      const request = createMockRequest('/orgs', { 'supabase-auth-token': 'test-token' })
      await middleware(request)

      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function),
          }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle Supabase client errors gracefully by redirecting to login', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Supabase error')),
        },
      })

      const request = createMockRequest('/orgs')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('https://example.com/login')
      expect(consoleSpy).toHaveBeenCalledWith('Middleware authentication error:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should not redirect to login if already on login page when error occurs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Supabase error')),
        },
      })

      const request = createMockRequest('/login')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      
      consoleSpy.mockRestore()
    })
  })

  describe('environment variables', () => {
    it('should throw error when SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      
      const request = createMockRequest('/orgs')
      
      await expect(middleware(request)).rejects.toThrow()
    })

    it('should throw error when SUPABASE_ANON_KEY is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      const request = createMockRequest('/orgs')
      
      await expect(middleware(request)).rejects.toThrow()
    })
  })
})