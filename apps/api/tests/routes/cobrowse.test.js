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

vi.mock('../../src/api/lib/cobrowse.js', () => ({
  getClientConfig: vi.fn(),
  signAgentToken: vi.fn(),
  isCobrowseEnabled: vi.fn(),
}));

const { supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const { getClientConfig, signAgentToken, isCobrowseEnabled } = await import('../../src/api/lib/cobrowse.js');
const cobrowseRouter = (await import('../../src/api/routes/cobrowse.js')).default;

const AUTH_HEADERS = { 'x-api-key': 'test-api-key-value', 'x-org-id': 'org-1' };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/cobrowse', cobrowseRouter);
  app.use(errorHandler);
  return app;
}

function mockChain(resolveValue) {
  return new Proxy(
    {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
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

// ---------------------------------------------------------------------------
// GET /api/cobrowse/config
// ---------------------------------------------------------------------------
describe('GET /api/cobrowse/config', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/config');
    expect(res.status).toBe(401);
  });

  it('returns config when authenticated', async () => {
    getClientConfig.mockReturnValue({ enabled: true, license: 'lic-123' });

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/config', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.license).toBe('lic-123');
    expect(getClientConfig).toHaveBeenCalled();
  });

  it('returns enabled: false when not configured', async () => {
    getClientConfig.mockReturnValue({ enabled: false, license: null });

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/config', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/agent-token
// ---------------------------------------------------------------------------
describe('GET /api/cobrowse/agent-token', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/agent-token');
    expect(res.status).toBe(401);
  });

  it('returns signed token for admin', async () => {
    isCobrowseEnabled.mockReturnValue(true);
    signAgentToken.mockReturnValue('jwt.token.here');

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/agent-token', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('jwt.token.here');
    expect(signAgentToken).toHaveBeenCalledWith({
      email: 'agent@system',
      orgId: 'org-1',
    });
  });

  it('returns 503 when Cobrowse is not configured', async () => {
    isCobrowseEnabled.mockReturnValue(false);

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/agent-token', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain('not configured');
  });
});

// ---------------------------------------------------------------------------
// POST /api/cobrowse/sessions
// ---------------------------------------------------------------------------
describe('POST /api/cobrowse/sessions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/cobrowse/sessions', {
      body: { session_id: 's-1' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 without session_id', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/cobrowse/sessions', {
      body: {},
      headers: AUTH_HEADERS,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('session_id');
  });

  it('creates a session event with valid data', async () => {
    const created = {
      id: 'uuid-1',
      org_id: 'org-1',
      session_id: 'cb-sess-1',
      session_state: 'active',
    };

    supabaseAdmin.from.mockImplementation(() =>
      mockChain({ data: created, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/cobrowse/sessions', {
      body: { session_id: 'cb-sess-1', session_state: 'active' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.session_id).toBe('cb-sess-1');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('cobrowse_sessions');
  });

  it('defaults to pending for invalid session_state', async () => {
    const created = {
      id: 'uuid-2',
      org_id: 'org-1',
      session_id: 'cb-sess-2',
      session_state: 'pending',
    };

    supabaseAdmin.from.mockImplementation(() =>
      mockChain({ data: created, error: null }),
    );

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/cobrowse/sessions', {
      body: { session_id: 'cb-sess-2', session_state: 'invalid_state' },
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.session_state).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/sessions
// ---------------------------------------------------------------------------
describe('GET /api/cobrowse/sessions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/sessions');
    expect(res.status).toBe(401);
  });

  it('returns paginated session history', async () => {
    const sessions = [
      { id: 'uuid-1', session_id: 'cb-1', session_state: 'ended' },
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
              return (resolve) => resolve({ data: sessions, count: 1, error: null });
            return target[prop];
          },
        },
      ),
    );

    const app = buildApp();
    const res = await testRequest(app, 'GET', '/api/cobrowse/sessions?page=1&limit=10', {
      headers: AUTH_HEADERS,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('cobrowse_sessions');
  });
});
