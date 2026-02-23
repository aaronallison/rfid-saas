import { Router } from 'express';
import XLSX from 'xlsx';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { auditLog } from '../lib/audit.js';
import { createExportSchema } from '../validators/exports.schemas.js';

const router = Router();
router.use(requireAuth);

const MAX_EXPORT_ROWS = 10000;

// POST /api/exports
router.post('/', validate({ body: createExportSchema }), async (req, res, next) => {
  try {
    const { format, batch_id, from, to, type, columns } = req.body;

    const selectCols = columns?.length ? columns.join(',') : '*';
    let query = supabaseAdmin
      .from('captures_universal')
      .select(selectCols)
      .eq('org_id', req.orgId);

    if (batch_id) query = query.eq('batch_id', batch_id);
    if (type) query = query.eq('type', type);
    if (from) query = query.gte('captured_at', from);
    if (to) query = query.lte('captured_at', to);

    query = query.order('captured_at', { ascending: false }).limit(MAX_EXPORT_ROWS);

    const { data, error } = await query;
    if (error) return next(error);

    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'export.create',
      resourceType: 'export',
      details: { format, count: data.length, batch_id, from, to, type },
      ipAddress: req.ip,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
      return res.json({ data, exported_at: new Date().toISOString(), count: data.length });
    }

    if (format === 'csv') {
      if (!data.length) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="export-${timestamp}.csv"`);
        return res.send('');
      }
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((h) => {
            const val = row[h];
            if (val == null) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(','),
        ),
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="export-${timestamp}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Captures');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="export-${timestamp}.xlsx"`);
      return res.send(buf);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
