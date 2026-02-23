import { supabaseAdmin } from './supabase.js';
import logger from './logger.js';

/**
 * Write an entry to the audit_log table. Fire-and-forget — never blocks the caller.
 * @param {Object} opts
 * @param {string} opts.orgId
 * @param {string} opts.userId
 * @param {string} opts.action       e.g. 'capture.create', 'batch.create'
 * @param {string} opts.resourceType e.g. 'capture', 'batch', 'org'
 * @param {string} [opts.resourceId]
 * @param {Object} [opts.details]
 * @param {string} [opts.ipAddress]
 */
export async function auditLog({ orgId, userId, action, resourceType, resourceId, details, ipAddress }) {
  try {
    await supabaseAdmin.from('audit_log').insert({
      org_id: orgId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    logger.error({ err, action, orgId }, 'Failed to write audit log');
  }
}
