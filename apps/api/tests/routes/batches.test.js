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
const batchesRouter = (await import('../../src/api/routes/batches.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/batches', batchesRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
  }, {
    get(target, prop) {
      if (prop === 'then') return (resolve) => resolve(resolveValue);
      return target[prop];
    },
  });
}

describe('GET /api/batches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated batches', async () => {
    supabaseAdmin.from.mockReturnValue(
      mockChain({ data: [{ batch_id: 'b1', name: 'Batch 1' }], count: 1, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/batches', { headers: AUTH_HEADERS });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe('POST /api/batches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a batch with valid data', async () => {
    const created = { batch_id: 'b-new', org_id: 'org-1', name: 'New Batch', status: 'open' };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'batches') return mockChain({ data: created, error: null });
      return mockChain({ data: null, error: null }); // audit_log
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/batches', {
      body: { name: 'New Batch' },
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Batch');
  });

  it('returns 400 for empty name', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/batches', {
      body: { name: '' },
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
  });
});
