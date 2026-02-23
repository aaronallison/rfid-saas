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

vi.mock('../../src/queue/queues.js', () => ({
  enqueueCase: vi.fn().mockResolvedValue({ id: 'job-1' }),
}));

const { supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const tasksRouter = (await import('../../src/api/routes/tasks.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', tasksRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy(
    {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resolveValue),
    },
    {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);
        }
        if (prop === 'catch') {
          return (handler) => Promise.resolve(resolveValue).catch(handler);
        }
        return target[prop];
      },
    },
  );
}

describe('POST /api/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks', {
      body: { title: 'test', case_type: 'bug' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 with missing title', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks', {
      body: { case_type: 'bug' },
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 with invalid case_type', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks', {
      body: { title: 'Test case', case_type: 'invalid' },
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
  });

  it('creates a case with valid data', async () => {
    const created = {
      case_id: 'c-1',
      org_id: 'org-1',
      title: 'Fix login bug',
      case_type: 'bug',
      stage: 'intake',
      status: 'open',
    };

    const auditChain = mockChain({ data: null, error: null });
    const eventsChain = mockChain({ data: null, error: null });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'cases') return mockChain({ data: created, error: null });
      if (table === 'case_events') return eventsChain;
      if (table === 'audit_log') return auditChain;
      return mockChain({ data: null, error: null });
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks', {
      body: { title: 'Fix login bug', case_type: 'bug', severity: 'high' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.case_id).toBe('c-1');
    expect(res.body.data.stage).toBe('intake');
  });
});

describe('GET /api/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated cases scoped by org_id', async () => {
    const cases = [
      { case_id: 'c-1', org_id: 'org-1', title: 'Bug 1', stage: 'intake' },
    ];

    supabaseAdmin.from.mockImplementation(() =>
      new Proxy(
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
        },
        {
          get(target, prop) {
            if (prop === 'then')
              return (resolve) => resolve({ data: cases, count: 1, error: null });
            return target[prop];
          },
        },
      ),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/tasks?page=1&limit=10', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('cases');
  });

  it('filters by stage and status', async () => {
    supabaseAdmin.from.mockImplementation(() =>
      new Proxy(
        {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
        },
        {
          get(target, prop) {
            if (prop === 'then')
              return (resolve) => resolve({ data: [], count: 0, error: null });
            return target[prop];
          },
        },
      ),
    );

    const app = buildApp();
    const res = await testRequest(
      app,
      'GET',
      '/api/tasks?stage=triage&status=in_progress',
      { headers: AUTH_HEADERS },
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/tasks/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns case with events, plans, and approvals', async () => {
    const caseData = { case_id: 'c-1', org_id: 'org-1', title: 'Bug', stage: 'plan' };
    const events = [{ event_id: 'e-1', event_type: 'stage_enter' }];
    const plans = [{ plan_id: 'p-1', version: 1 }];
    const approvals = [];

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'cases') return mockChain({ data: caseData, error: null });
      if (table === 'case_events') return mockChain({ data: events, error: null });
      if (table === 'plans') return mockChain({ data: plans, error: null });
      if (table === 'approvals') return mockChain({ data: approvals, error: null });
      return mockChain({ data: null, error: null });
    });

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/tasks/c-1', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.case_id).toBe('c-1');
    expect(res.body.data.events).toHaveLength(1);
    expect(res.body.data.plans).toHaveLength(1);
  });

  it('returns 404 for non-existent case', async () => {
    supabaseAdmin.from.mockImplementation(() =>
      mockChain({ data: null, error: { message: 'not found' } }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/tasks/nonexistent', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/tasks/:id/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves a case awaiting human review', async () => {
    const caseData = {
      case_id: 'c-1',
      org_id: 'org-1',
      stage: 'plan_review',
      status: 'needs_human',
    };

    const updateChain = mockChain({ data: null, error: null });
    const eventsChain = mockChain({ data: null, error: null });
    const auditChain = mockChain({ data: null, error: null });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'cases') return mockChain({ data: caseData, error: null });
      if (table === 'approvals') return updateChain;
      if (table === 'case_events') return eventsChain;
      if (table === 'audit_log') return auditChain;
      return mockChain({ data: null, error: null });
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks/c-1/approve', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Approved');
    expect(res.body.stage).toBe('plan_review');
  });

  it('returns 400 if case is not awaiting approval', async () => {
    const caseData = {
      case_id: 'c-1',
      org_id: 'org-1',
      stage: 'triage',
      status: 'in_progress',
    };

    supabaseAdmin.from.mockImplementation(() =>
      mockChain({ data: caseData, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/tasks/c-1/approve', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('not awaiting');
  });
});
