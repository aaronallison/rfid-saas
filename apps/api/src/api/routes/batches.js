import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { auditLog } from '../lib/audit.js';
import { createBatchSchema, listBatchesSchema } from '../validators/batches.schemas.js';

const router = Router();
router.use(requireAuth);

// GET /api/batches
router.get('/', validate({ query: listBatchesSchema }), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    let query = supabaseAdmin
      .from('batches')
      .select('*', { count: 'exact' })
      .eq('org_id', req.orgId);

    if (status) query = query.eq('status', status);

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
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

// POST /api/batches
router.post('/', validate({ body: createBatchSchema }), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('batches')
      .insert({
        org_id: req.orgId,
        created_by: req.user.id,
        name: req.body.name,
        status: req.body.status,
      })
      .select()
      .single();

    if (error) return next(error);

    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'batch.create',
      resourceType: 'batch',
      resourceId: data.batch_id,
      ipAddress: req.ip,
    });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
