import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { auditLog } from '../lib/audit.js';
import { patchOrgSchema, listMembersSchema } from '../validators/orgs.schemas.js';

const router = Router();
router.use(requireAuth);

// GET /api/orgs — current org details
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('org_id, name, created_at')
      .eq('org_id', req.orgId)
      .single();

    if (error) return next(error);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orgs — update org (admin/owner only)
router.patch('/', requireRole(['admin', 'owner']), validate({ body: patchOrgSchema }), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(req.body)
      .eq('org_id', req.orgId)
      .select()
      .single();

    if (error) return next(error);

    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'org.update',
      resourceType: 'org',
      resourceId: req.orgId,
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/orgs/:orgId/members — list members
router.get('/:orgId/members', validate({ query: listMembersSchema }), async (req, res, next) => {
  try {
    if (req.params.orgId !== req.orgId) {
      return res.status(403).json({ error: 'Cannot view members of another organization' });
    }

    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabaseAdmin
      .from('org_members')
      .select('user_id, role, level, dev_role, phone, created_at', { count: 'exact' })
      .eq('org_id', req.orgId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return next(error);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
