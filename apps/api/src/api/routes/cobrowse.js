import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getClientConfig, signAgentToken, isCobrowseEnabled } from '../lib/cobrowse.js';
import logger from '../lib/logger.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/cobrowse/config — client SDK configuration (any authenticated user)
// ---------------------------------------------------------------------------
router.get('/config', requireAuth, (_req, res) => {
  res.json(getClientConfig());
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/agent-token — signed JWT for agent dashboard (admin only)
// ---------------------------------------------------------------------------
router.get('/agent-token', requireAuth, requireRole(['admin']), (req, res, next) => {
  try {
    if (!isCobrowseEnabled()) {
      return res.status(503).json({ error: 'Cobrowse is not configured' });
    }

    const token = signAgentToken({
      email: req.user.email,
      orgId: req.orgId,
    });

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/cobrowse/sessions — log a session event from the client SDK
// ---------------------------------------------------------------------------
router.post('/sessions', requireAuth, async (req, res, next) => {
  try {
    const { session_id, session_state, metadata } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const validStates = ['pending', 'authorizing', 'active', 'ended'];
    const state = validStates.includes(session_state) ? session_state : 'pending';

    const record = {
      org_id: req.orgId,
      user_id: req.user.id,
      user_email: req.user.email,
      session_id,
      session_state: state,
      metadata: metadata || {},
    };

    if (state === 'ended') {
      record.ended_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('cobrowse_sessions')
      .insert(record)
      .select()
      .single();

    if (error) {
      logger.error({ error, session_id }, 'Failed to log cobrowse session');
      return res.status(500).json({ error: 'Failed to log session' });
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/sessions/active — list active sessions for org (admin only)
// ---------------------------------------------------------------------------
router.get('/sessions/active', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('cobrowse_sessions')
      .select('*')
      .eq('org_id', req.orgId)
      .in('session_state', ['active', 'authorizing', 'pending'])
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to list active cobrowse sessions');
      return res.status(500).json({ error: 'Failed to list active sessions' });
    }

    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/sessions — list session history for org (audit)
// ---------------------------------------------------------------------------
router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const query = supabaseAdmin
      .from('cobrowse_sessions')
      .select('*', { count: 'exact' })
      .eq('org_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) {
      logger.error({ error }, 'Failed to list cobrowse sessions');
      return res.status(500).json({ error: 'Failed to list sessions' });
    }

    res.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/sdk-version — public SDK version info
// ---------------------------------------------------------------------------
router.get('/sdk-version', (_req, res) => {
  res.json({
    version: '1.0.0',
    platforms: ['web', 'react', 'android', 'ios', 'windows'],
    web: {
      version: '1.0.0',
      cdn: 'https://cdn.jsdelivr.net/npm/@grotap/cobrowse-web@1.0.0/dist/index.js',
    },
    react: {
      version: '1.0.0',
      npm: '@grotap/cobrowse-react@1.0.0',
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/cobrowse/defaults — default configuration (authenticated users)
// ---------------------------------------------------------------------------
router.get('/defaults', requireAuth, (_req, res) => {
  res.json({
    capabilities: [
      'cursor',
      'drawing',
      'laser',
      'rectangles',
      'arrows',
      'pointer',
      'keypress',
      'scroll',
      'select',
      'disappearing_ink',
    ],
    redaction: {
      autoRedact: true,
      selectors: [
        'input[type=password]',
        '.redacted',
        '.sensitive',
        '.ssn',
        '.card-number',
        '.cvv',
        '.social-security',
        '.credit-card',
        '[data-redact]',
      ],
    },
    features: {
      annotation: true,
      remoteControl: true,
      redaction: true,
      fullDevice: false,
      universal: true,
      consent: true,
      audit: true,
      ai: false,
      agentPresent: false,
    },
  });
});

export default router;
