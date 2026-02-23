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
const exportsRouter = (await import('../../src/api/routes/exports.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/exports', exportsRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  }, {
    get(target, prop) {
      if (prop === 'then') return (resolve) => resolve(resolveValue);
      return target[prop];
    },
  });
}

describe('POST /api/exports', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns JSON export', async () => {
    const captures = [
      { cntid: 1, rfid_tag: 'T1', org_id: 'org-1' },
      { cntid: 2, rfid_tag: 'T2', org_id: 'org-1' },
    ];

    supabaseAdmin.from.mockReturnValue(mockChain({ data: captures, error: null }));

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/exports', {
      body: { format: 'json' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });

  it('returns CSV export', async () => {
    const captures = [{ cntid: 1, rfid_tag: 'T1' }];

    supabaseAdmin.from.mockReturnValue(mockChain({ data: captures, error: null }));

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/exports', {
      body: { format: 'csv' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('returns XLSX export', async () => {
    const captures = [{ cntid: 1, rfid_tag: 'T1' }];

    supabaseAdmin.from.mockReturnValue(mockChain({ data: captures, error: null }));

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/exports', {
      body: { format: 'xlsx' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('returns 400 for invalid format', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/exports', {
      body: { format: 'pdf' },
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
  });
});
