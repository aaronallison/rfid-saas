/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

// Mock crypto.randomUUID for testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123'
  }
})

describe('Middleware', () => {
  const createMockRequest = (url: string, method: string = 'GET', headers: Record<string, string> = {}) => {
    return new NextRequest(url, {
      method,
      headers: new Headers(headers)
    })
  }

  beforeEach(() => {
    // Reset console.log mock
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should add security headers to all responses', () => {
    const request = createMockRequest('http://localhost:3000/test')
    const response = middleware(request)

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(response.headers.get('X-Request-ID')).toBe('test-uuid-123')
  })

  it('should handle CORS for API routes with allowed origins', () => {
    const request = createMockRequest('http://localhost:3000/api/test', 'GET', {
      'origin': 'http://localhost:3000'
    })
    const response = middleware(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS')
  })

  it('should not set CORS headers for non-API routes', () => {
    const request = createMockRequest('http://localhost:3000/dashboard', 'GET', {
      'origin': 'http://localhost:3000'
    })
    const response = middleware(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('should handle preflight OPTIONS requests', () => {
    const request = createMockRequest('http://localhost:3000/api/test', 'OPTIONS', {
      'origin': 'http://localhost:3000'
    })
    const response = middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })

  it('should reject CORS for non-allowed origins', () => {
    const request = createMockRequest('http://localhost:3000/api/test', 'GET', {
      'origin': 'http://malicious-site.com'
    })
    const response = middleware(request)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})