/* ================================================================
   GroTap — BullMQ queue definitions
   ================================================================ */

import { Queue } from 'bullmq';
import { getRedisConnection } from './connection.js';
import logger from '../api/lib/logger.js';

export const QUEUE_NAME = 'grotap-cases';

let caseQueue = null;

function getCaseQueue() {
  if (caseQueue) return caseQueue;
  const connection = getRedisConnection();
  if (!connection) return null;

  caseQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  return caseQueue;
}

/**
 * Enqueue a case for processing. Fails gracefully if Redis is unavailable.
 * @param {string} caseId
 * @param {string} stage
 * @returns {Promise<object|null>} BullMQ Job or null
 */
export async function enqueueCase(caseId, stage) {
  const queue = getCaseQueue();
  if (!queue) {
    logger.warn({ caseId, stage }, 'Queue unavailable — case not enqueued');
    return null;
  }

  const job = await queue.add(
    `process-${stage}`,
    { caseId, stage, enqueuedAt: new Date().toISOString() },
    { jobId: `${caseId}-${stage}-${Date.now()}` },
  );

  logger.info({ caseId, stage, jobId: job.id }, 'Case enqueued');
  return job;
}

export { getCaseQueue };
