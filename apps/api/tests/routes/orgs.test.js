import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { testRequest } from '../setup.js';
import errorHandler from '../../src/api/middleware/errorHandler.js';

vi.mock('../../src/api/lib/supabase.js', () => ({
  supabase: {},
  supabaseAdmin: {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

vi.mock('../../src/api/lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const orgsRouter = (await import('../../src/api/routes/orgs.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orgs', orgsRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
  }, {
    get(target, prop) {
      if (prop === 'then') return (resolve) => resolve(resolveValue);
      return target[prop];
    },
  });
}

describe('GET /api/orgs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns current org details', async () => {
    supabaseAdmin.from.mockReturnValue(
      mockChain({ data: { org_id: 'org-1', name: 'Test Org', created_at: '2024-01-01' }, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/orgs', { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    expect(res.body.data.org_id).toBe('org-1');
  });
});

describe('PATCH /api/orgs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates org name for admin', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'organizations') {
        return mockChain({ data: { org_id: 'org-1', name: 'Updated' }, error: null });
      }
      return mockChain({ data: null, error: null }); // audit_log
    });

    const app = buildApp();
    const res = await testRequest(app, 'PATCH', '/api/orgs', {
      body: { name: 'Updated' },
      headers: AUTH_HEADERS, // API key auth = admin role
    });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  it('returns 400 for empty body', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'PATCH', '/api/orgs', {
      body: {},
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orgs/:orgId/members', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns members for own org', async () => {
    supabaseAdmin.from.mockReturnValue(
      mockChain({ data: [{ user_id: 'u1', role: 'admin' }], count: 1, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/orgs/org-1/members', { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 403 for different org', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/orgs/org-other/members', { headers: AUTH_HEADERS });
    expect(res.status).toBe(403);
  });
});
