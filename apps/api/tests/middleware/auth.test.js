import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { testRequest } from '../setup.js';

// Mock supabase before importing auth middleware
vi.mock('../../src/api/lib/supabase.js', () => {
  const mockFrom = vi.fn();
  return {
    supabase: {},
    supabaseAdmin: {
      auth: { getUser: vi.fn() },
      from: mockFrom,
    },
  };
});

vi.mock('../../src/api/lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const { requireAuth, requireRole } = await import('../../src/api/middleware/auth.js');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/test', requireAuth, (req, res) => {
    res.json({ user: req.user, orgId: req.orgId, role: req.userRole, method: req.authMethod });
  });
  app.get('/admin', requireAuth, requireRole(['admin', 'owner']), (req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = 'test-api-key-value';
  });

  it('returns 401 when no auth header provided', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing authorization');
  });

  it('returns 401 for invalid JWT', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', { headers: { Authorization: 'Bearer bad-token' } });
    expect(res.status).toBe(401);
  });

  it('sets req.user and req.orgId for valid JWT with single org', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    });

    // Mock org_members lookup (no x-org-id header => fetches all memberships)
    const memberChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Make thenable
    const memberProxy = new Proxy(memberChain, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: [{ org_id: 'org-1', role: 'member', level: 'standard' }], error: null });
        return target[prop];
      },
    });
    supabaseAdmin.from.mockReturnValue(memberProxy);

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', { headers: { Authorization: 'Bearer valid-token' } });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-1');
    expect(res.body.orgId).toBe('org-1');
    expect(res.body.role).toBe('member');
    expect(res.body.method).toBe('jwt');
  });

  it('returns 400 for multi-org user without x-org-id header', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'multi@test.com' } },
      error: null,
    });

    const memberProxy = new Proxy({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({
          data: [
            { org_id: 'org-1', role: 'member', level: 'standard' },
            { org_id: 'org-2', role: 'admin', level: 'standard' },
          ],
          error: null,
        });
        return target[prop];
      },
    });
    supabaseAdmin.from.mockReturnValue(memberProxy);

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', { headers: { Authorization: 'Bearer valid-token' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('multiple orgs');
  });

  it('authenticates with valid API key and x-org-id', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', {
      headers: { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-99' },
    });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('api-agent');
    expect(res.body.orgId).toBe('org-99');
    expect(res.body.method).toBe('api-key');
  });

  it('returns 401 for invalid API key', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', {
      headers: { 'x-api-key': 'wrong-key', 'x-org-id': 'org-99' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 for API key without x-org-id', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/test', {
      headers: { 'x-api-key': 'test-api-key-value' },
    });
    expect(res.status).toBe(400);
  });
});

describe('requireRole', () => {
  it('allows matching role', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    });

    const memberProxy = new Proxy({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: [{ org_id: 'org-1', role: 'admin', level: 'standard' }], error: null });
        return target[prop];
      },
    });
    supabaseAdmin.from.mockReturnValue(memberProxy);

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/admin', { headers: { Authorization: 'Bearer valid-token' } });
    expect(res.status).toBe(200);
  });

  it('blocks non-matching role', async () => {
    supabaseAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'member@test.com' } },
      error: null,
    });

    const memberProxy = new Proxy({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: [{ org_id: 'org-1', role: 'member', level: 'standard' }], error: null });
        return target[prop];
      },
    });
    supabaseAdmin.from.mockReturnValue(memberProxy);

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/admin', { headers: { Authorization: 'Bearer valid-token' } });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
  });
});
