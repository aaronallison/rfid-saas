import { vi } from 'vitest';

// Stub env vars so modules that read them at import time don't throw
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.API_KEY = 'test-api-key-value';
process.env.NODE_ENV = 'test';

// ---------------------------------------------------------------------------
// Mock Supabase — provides chainable query builder
// ---------------------------------------------------------------------------

/** Build a chainable mock that records calls and resolves with configurable data */
export function createChainableMock(resolveValue = { data: [], error: null }) {
  const chain = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'is',
    'in', 'order', 'range', 'limit', 'single', 'maybeSingle',
    'csv',
  ];

  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods return the resolveValue
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  chain.then = (resolve) => resolve(resolveValue);

  // Make the chain itself thenable (so `await supabaseAdmin.from(...).select(...)` works)
  chain[Symbol.for('nodejs.util.promisify.custom')] = () => Promise.resolve(resolveValue);

  // Override to make await work on the chain directly
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);
      }
      return target[prop];
    },
  };

  return new Proxy(chain, handler);
}

// ---------------------------------------------------------------------------
// Test app helper — creates a minimal Express app for route testing
// ---------------------------------------------------------------------------

import express from 'express';
import errorHandler from '../src/api/middleware/errorHandler.js';

export function createTestApp(router, mountPath = '/api/test') {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use(errorHandler);
  return app;
}

/** Make an HTTP request to a test app */
export async function testRequest(app, method, path, { body, headers } = {}) {
  const { createServer } = await import('node:http');

  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}${path}`;

      const opts = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', ...headers },
      };
      if (body) opts.body = JSON.stringify(body);

      fetch(url, opts)
        .then(async (res) => {
          const text = await res.text();
          let json;
          try { json = JSON.parse(text); } catch { json = text; }
          resolve({ status: res.status, body: json, headers: Object.fromEntries(res.headers) });
        })
        .catch(reject)
        .finally(() => server.close());
    });
  });
}
