import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';

const router = Router();

// Simple ping endpoint for Railway healthcheck - always returns 200 OK
router.get('/ping', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', async (_req, res) => {
  const checks = { api: 'ok' };

  // Supabase connectivity with timeout
  if (supabaseAdmin) {
    try {
      // Add 5-second timeout to prevent healthcheck hanging
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 5000)
      );
      const dbPromise = supabaseAdmin.from('organizations').select('id').limit(1);
      const result = await Promise.race([dbPromise, timeoutPromise]);

      if (result.timeout) {
        checks.supabase = 'timeout';
      } else if (result.error) {
        checks.supabase = 'error';
      } else {
        checks.supabase = 'ok';
      }
    } catch {
      checks.supabase = 'unreachable';
    }
  } else {
    checks.supabase = 'not_configured';
  }

  // Consider 'timeout' as acceptable during healthcheck (app is running, DB might be slow)
  const healthy = Object.values(checks).every((v) =>
    v === 'ok' || v === 'not_configured' || v === 'timeout'
  );

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
