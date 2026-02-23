/* ================================================================
   GroTap — BullMQ worker bootstrap
   Can be run standalone: node src/queue/worker.js
   Or imported and started from server.js for local dev.
   ================================================================ */

import 'dotenv/config';
import { Worker } from 'bullmq';
import { getRedisConnection } from './connection.js';
import { QUEUE_NAME } from './queues.js';
import { processCase } from '../agent/orchestrator.js';
import logger from '../api/lib/logger.js';

/**
 * Starts a BullMQ worker that processes cases through the orchestrator.
 * Returns null if Redis is unavailable.
 */
export function startWorker() {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('Cannot start worker — Redis unavailable');
    return null;
  }

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { caseId, stage } = job.data;
      logger.info({ caseId, stage, jobId: job.id }, 'Processing case');

      try {
        await processCase(caseId, stage);
      } catch (err) {
        logger.error({ err, caseId, stage }, 'Case processing failed');
        throw err; // BullMQ handles retries
      }
    },
    {
      connection,
      concurrency: 2,
      limiter: { max: 5, duration: 60_000 }, // 5 jobs per minute
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, caseId: job.data.caseId }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Job failed');
  });

  logger.info('Case worker started');
  return worker;
}

// Run standalone: node src/queue/worker.js
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('queue/worker.js');
if (isMain) {
  startWorker();
}
