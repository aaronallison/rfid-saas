/* ================================================================
   GroTap — Redis connection (graceful degradation)
   ================================================================ */

import IORedis from 'ioredis';
import logger from '../api/lib/logger.js';

let connection = null;
let connected = false;

/**
 * Returns a shared IORedis instance configured for BullMQ.
 * Returns null if REDIS_URL is not set or connection fails.
 */
export function getRedisConnection() {
  if (connection) return connection;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn('REDIS_URL not set — queue functionality disabled');
    return null;
  }

  try {
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) {
          logger.error('Redis: giving up after 5 retries');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
    });

    connection.on('connect', () => {
      connected = true;
      logger.info('Redis connected');
    });
    connection.on('error', (err) => {
      connected = false;
      logger.error({ err: err.message }, 'Redis error');
    });
    connection.on('close', () => {
      connected = false;
    });

    // Attempt connection but don't block
    connection.connect().catch(() => {
      logger.warn('Redis initial connect failed — queue will retry');
    });

    return connection;
  } catch (err) {
    logger.error({ err }, 'Failed to create Redis connection');
    return null;
  }
}

export function isRedisAvailable() {
  return connected;
}
