/* ================================================================
   GroTap — /api/tasks routes (agentic pipeline intake + management)
   ================================================================ */

import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { auditLog } from '../lib/audit.js';
import logger from '../lib/logger.js';
import { createTaskSchema, listTasksSchema } from '../validators/tasks.schemas.js';
import { enqueueCase } from '../../queue/queues.js';

const router = Router();
router.use(requireAuth);

// ---------- POST /api/tasks — create a new case ----------
router.post('/', validate({ body: createTaskSchema }), async (req, res, next) => {
  try {
    const row = {
      org_id: req.orgId,
      submitted_by: req.user.id,
      title: req.body.title,
      description: req.body.description || null,
      case_type: req.body.case_type,
      severity: req.body.severity || null,
      area: req.body.area || null,
      metadata: req.body.metadata || {},
      stage: 'intake',
      status: 'open',
      assigned_to: 'agent',
    };

    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert(row)
      .select()
      .single();

    if (error) return next(error);

    // Record intake event (fire-and-forget)
    supabaseAdmin
      .from('case_events')
      .insert({
        case_id: data.case_id,
        org_id: req.orgId,
        stage: 'intake',
        event_type: 'stage_enter',
        actor: req.user.id,
        summary: `Case created: ${data.title}`,
      })
      .then(() => {})
      .catch(() => {});

    // Enqueue for processing (graceful if Redis unavailable)
    try {
      await enqueueCase(data.case_id, 'intake');
    } catch (queueErr) {
      logger.warn({ err: queueErr, caseId: data.case_id }, 'Failed to enqueue case');
    }

    // Audit log (fire-and-forget)
    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'task.create',
      resourceType: 'case',
      resourceId: data.case_id,
      ipAddress: req.ip,
    });

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/tasks — list cases for the org ----------
router.get('/', validate({ query: listTasksSchema }), async (req, res, next) => {
  try {
    const { stage, status, case_type, page, limit } = req.query;

    let query = supabaseAdmin
      .from('cases')
      .select('*', { count: 'exact' })
      .eq('org_id', req.orgId);

    if (stage) query = query.eq('stage', stage);
    if (status) query = query.eq('status', status);
    if (case_type) query = query.eq('case_type', case_type);

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) return next(error);

    res.json({
      data,
      pagination: { page, limit, total: count, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- GET /api/tasks/:id — single case with events + plans ----------
router.get('/:id', async (req, res, next) => {
  try {
    const { data: caseData, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('case_id', req.params.id)
      .eq('org_id', req.orgId)
      .single();

    if (error || !caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Fetch events and plans in parallel
    const [eventsResult, plansResult, approvalsResult] = await Promise.all([
      supabaseAdmin
        .from('case_events')
        .select('*')
        .eq('case_id', req.params.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('plans')
        .select('*')
        .eq('case_id', req.params.id)
        .order('version', { ascending: false }),
      supabaseAdmin
        .from('approvals')
        .select('*')
        .eq('case_id', req.params.id)
        .order('created_at', { ascending: false }),
    ]);

    res.json({
      data: {
        ...caseData,
        events: eventsResult.data || [],
        plans: plansResult.data || [],
        approvals: approvalsResult.data || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------- POST /api/tasks/:id/approve — human approval for a gate ----------
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { data: caseData, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('case_id', req.params.id)
      .eq('org_id', req.orgId)
      .single();

    if (error || !caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (caseData.status !== 'needs_human') {
      return res.status(400).json({ error: 'Case is not awaiting approval' });
    }

    // Update the pending approval record
    await supabaseAdmin
      .from('approvals')
      .update({
        status: 'approved',
        decided_by: req.user.id,
        decided_at: new Date().toISOString(),
      })
      .eq('case_id', req.params.id)
      .eq('status', 'pending');

    // Set case back to in_progress so orchestrator can advance
    await supabaseAdmin
      .from('cases')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', req.params.id);

    // Record event
    supabaseAdmin
      .from('case_events')
      .insert({
        case_id: req.params.id,
        org_id: req.orgId,
        stage: caseData.stage,
        event_type: 'approval_granted',
        actor: req.user.id,
        summary: `Approved by user at stage: ${caseData.stage}`,
      })
      .then(() => {})
      .catch(() => {});

    // Re-enqueue to continue processing
    try {
      await enqueueCase(req.params.id, caseData.stage);
    } catch (queueErr) {
      logger.warn({ err: queueErr }, 'Failed to re-enqueue after approval');
    }

    // Audit
    auditLog({
      orgId: req.orgId,
      userId: req.user.id,
      action: 'task.approve',
      resourceType: 'case',
      resourceId: req.params.id,
      details: { stage: caseData.stage },
      ipAddress: req.ip,
    });

    res.json({ message: 'Approved', stage: caseData.stage });
  } catch (err) {
    next(err);
  }
});

export default router;
