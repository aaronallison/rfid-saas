import crypto from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import logger from '../lib/logger.js';

function unauthorized(res, message) {
  return res.status(401).json({ error: message });
}

function forbidden(res, message) {
  return res.status(403).json({ error: message });
}

async function handleApiKey(apiKey, req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return unauthorized(res, 'API key auth not configured');

  const a = Buffer.from(apiKey);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return unauthorized(res, 'Invalid API key');
  }

  const orgId = req.headers['x-org-id'];
  if (!orgId) {
    return res.status(400).json({ error: 'x-org-id header required for API key auth' });
  }

  req.user = { id: 'api-agent', email: 'agent@system' };
  req.orgId = orgId;
  req.userRole = 'admin';
  req.authMethod = 'api-key';
  next();
}

async function handleJwt(token, req, res, next) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return unauthorized(res, 'Invalid or expired token');

    const orgIdHeader = req.headers['x-org-id'];
    let membership;

    if (orgIdHeader) {
      const { data, error: memErr } = await supabaseAdmin
        .from('org_members')
        .select('org_id, role, level')
        .eq('user_id', user.id)
        .eq('org_id', orgIdHeader)
        .single();

      if (memErr || !data) return forbidden(res, 'Not a member of this organization');
      membership = data;
    } else {
      const { data, error: memErr } = await supabaseAdmin
        .from('org_members')
        .select('org_id, role, level')
        .eq('user_id', user.id);

      if (memErr || !data?.length) return forbidden(res, 'No org membership found');
      if (data.length > 1) {
        return res.status(400).json({ error: 'User belongs to multiple orgs; provide x-org-id header' });
      }
      membership = data[0];
    }

    req.user = { id: user.id, email: user.email };
    req.orgId = membership.org_id;
    req.userRole = membership.role;
    req.userLevel = membership.level;
    req.authMethod = 'jwt';
    next();
  } catch (err) {
    logger.error({ err }, 'JWT auth error');
    return unauthorized(res, 'Authentication failed');
  }
}

export async function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return handleApiKey(apiKey, req, res, next);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'Missing authorization');
  }
  return handleJwt(authHeader.slice(7), req, res, next);
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
