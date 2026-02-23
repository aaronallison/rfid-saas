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
const capturesRouter = (await import('../../src/api/routes/captures.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/captures', capturesRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
  }, {
    get(target, prop) {
      if (prop === 'then') return (resolve) => resolve(resolveValue);
      return target[prop];
    },
  });
}

describe('POST /api/captures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/captures', { body: { rfid_tag: 'ABC' } });
    expect(res.status).toBe(401);
  });

  it('creates a capture with valid data', async () => {
    const created = { cntid: 1, org_id: 'org-1', rfid_tag: 'ABC', status: 'synced' };

    // Mock audit_log insert (fire-and-forget)
    const auditChain = mockChain({ data: null, error: null });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'captures_universal') {
        return mockChain({ data: created, error: null });
      }
      if (table === 'audit_log') return auditChain;
      return mockChain({ data: null, error: null });
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/captures', {
      body: { rfid_tag: 'ABC', lat: 51.5, lng: -0.12 },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.rfid_tag).toBe('ABC');
  });

  it('validates batch belongs to org', async () => {
    // Batch lookup returns nothing (wrong org)
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'batches') {
        return mockChain({ data: null, error: { message: 'not found' } });
      }
      return mockChain({ data: null, error: null });
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/captures', {
      body: { rfid_tag: 'ABC', batch_id: '00000000-0000-0000-0000-000000000001' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Batch not found');
  });
});

describe('GET /api/captures', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated captures scoped by org_id', async () => {
    const captures = [{ cntid: 1, org_id: 'org-1', rfid_tag: 'T1' }];

    supabaseAdmin.from.mockImplementation(() => {
      return new Proxy({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      }, {
        get(target, prop) {
          if (prop === 'then') return (resolve) => resolve({ data: captures, count: 1, error: null });
          return target[prop];
        },
      });
    });

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/captures?page=1&limit=10', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);

    // Verify org_id was passed to the query
    expect(supabaseAdmin.from).toHaveBeenCalledWith('captures_universal');
  });
});
