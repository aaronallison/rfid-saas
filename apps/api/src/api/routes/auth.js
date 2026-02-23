import { Router } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import validate from '../middleware/validate.js';
import { loginSchema, signupSchema, refreshSchema } from '../validators/auth.schemas.js';

const router = Router();

// POST /api/auth/login
router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(401).json({ error: 'Invalid credentials' });

    const { data: memberships } = await supabaseAdmin
      .from('org_members')
      .select('org_id, role, level')
      .eq('user_id', data.user.id);

    // Fetch org names for each membership
    let orgs = [];
    if (memberships?.length) {
      const orgIds = memberships.map((m) => m.org_id);
      const { data: orgRows } = await supabaseAdmin
        .from('organizations')
        .select('org_id, name')
        .in('org_id', orgIds);

      orgs = memberships.map((m) => ({
        org_id: m.org_id,
        role: m.role,
        name: orgRows?.find((o) => o.org_id === m.org_id)?.name || null,
      }));
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
      orgs,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/signup
router.post('/signup', validate({ body: signupSchema }), async (req, res, next) => {
  try {
    const { email, password, invite_token } = req.body;

    // If invite token provided, validate it first
    let invite = null;
    if (invite_token) {
      const { data, error } = await supabaseAdmin
        .from('invite_tokens')
        .select('*')
        .eq('token', invite_token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return res.status(400).json({ error: 'Invalid or expired invite token' });
      }
      invite = data;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    // If invite, create org membership and mark token as accepted
    if (invite && data.user) {
      await supabaseAdmin.from('org_members').insert({
        org_id: invite.org_id,
        user_id: data.user.id,
        role: invite.role || 'member',
      });

      await supabaseAdmin
        .from('invite_tokens')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token_id', invite.token_id);
    }

    res.status(201).json({
      access_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
      user: { id: data.user?.id, email: data.user?.email },
      org_id: invite?.org_id || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate({ body: refreshSchema }), async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) return res.status(401).json({ error: 'Invalid refresh token' });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
