import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testRequest } from '../setup.js';
import express from 'express';
import errorHandler from '../../src/api/middleware/errorHandler.js';

vi.mock('../../src/api/lib/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/api/lib/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const { supabase, supabaseAdmin } = await import('../../src/api/lib/supabase.js');
const authRouter = (await import('../../src/api/routes/auth.js')).default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid email', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'not-an-email', password: 'password123' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 401 for invalid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid' } });
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'test@test.com', password: 'password123' },
    });
    expect(res.status).toBe(401);
  });

  it('returns tokens and orgs on valid login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-1', email: 'test@test.com' },
        session: { access_token: 'at-123', refresh_token: 'rt-123' },
      },
      error: null,
    });

    // Mock membership lookup
    const memberChain = new Proxy({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: [{ org_id: 'org-1', role: 'admin', level: 'standard' }], error: null });
        return target[prop];
      },
    });

    // Mock org lookup
    const orgChain = new Proxy({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    }, {
      get(target, prop) {
        if (prop === 'then') return (resolve) => resolve({ data: [{ org_id: 'org-1', name: 'Test Org' }], error: null });
        return target[prop];
      },
    });

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'org_members') return memberChain;
      if (table === 'organizations') return orgChain;
      return memberChain;
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'test@test.com', password: 'password123' },
    });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBe('at-123');
    expect(res.body.orgs).toHaveLength(1);
    expect(res.body.orgs[0].org_id).toBe('org-1');
  });
});

describe('POST /api/auth/signup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for short password', async () => {
    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/signup', {
      body: { email: 'new@test.com', password: 'short' },
    });
    expect(res.status).toBe(400);
  });

  it('creates user on valid signup', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'new-user', email: 'new@test.com' },
        session: { access_token: 'at-new', refresh_token: 'rt-new' },
      },
      error: null,
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/signup', {
      body: { email: 'new@test.com', password: 'password123' },
    });
    expect(res.status).toBe(201);
    expect(res.body.user.id).toBe('new-user');
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns new tokens on valid refresh', async () => {
    supabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'at-refreshed', refresh_token: 'rt-refreshed' } },
      error: null,
    });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/refresh', {
      body: { refresh_token: 'rt-old' },
    });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBe('at-refreshed');
  });

  it('returns 401 for invalid refresh token', async () => {
    supabase.auth.refreshSession.mockResolvedValue({ data: null, error: { message: 'Invalid' } });

    const app = buildApp();
    const res = await testRequest(app, 'POST', '/api/auth/refresh', {
      body: { refresh_token: 'bad-token' },
    });
    expect(res.status).toBe(401);
  });
});
