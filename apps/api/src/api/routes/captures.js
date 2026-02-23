import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { auditLog } from '../lib/audit.js';
import { createCaptureSchema, listCapturesSchema } from '../validators/captures.schemas.js';

const router = Router();
router.use(requireAuth);

// POST /api/captures
router.post('/', validate({ body: createCaptureSchema }), async (req, res, next) => {
  try {
    const body = req.body;

    // Verify batch ownership if batch_id provided
    if (body.batch_id) {
      const { data: batch, error } = await supabaseAdmin
        .from('batches')
        .select('batch_id')
        .eq('batch_id', body.batch_id)
        .eq('org_id', req.orgId)
        .single();

      if (error || !batch) {
        return res.status(400).json({ error: 'Batch not found or does not belong to this org' });
      }
    }

    const row = {
      org_id: req.orgId,
      scanned_by: req.user.id,
      captured_at: new Date().toISOString(),
      status: 'synced',
      ...body,
    };

    const { data, error } = await supabaseAdmin
      .from('captures_universal')
      .insert(row)
      .select()
      .single();

    if (error) return next(error);

    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'capture.create',
      resourceType: 'capture',
      resourceId: data.cntid?.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/captures
router.get('/', validate({ query: listCapturesSchema }), async (req, res, next) => {
  try {
    const { batch_id, type, rfid_tag, status, from, to, page, limit, sort, order } = req.query;

    let query = supabaseAdmin
      .from('captures_universal')
      .select('*', { count: 'exact' })
      .eq('org_id', req.orgId);

    if (batch_id) query = query.eq('batch_id', batch_id);
    if (type) query = query.eq('type', type);
    if (rfid_tag) query = query.ilike('rfid_tag', `%${rfid_tag}%`);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('captured_at', from);
    if (to) query = query.lte('captured_at', to);

    const offset = (page - 1) * limit;
    query = query
      .order(sort, { ascending: order === 'asc' })
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

export default router;
