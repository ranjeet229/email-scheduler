import Redis from 'ioredis';
import { env } from './env.js';

let redis: Redis | null = null;

/**
 * Shared Redis connection for BullMQ and rate limiting.
 * BullMQ creates its own connection from REDIS_URL; this is for rate-limit utils.
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
