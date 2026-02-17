/**
 * Redis-based hourly rate limit for email sending.
 *
 * Key: email_sent:{senderId}:{YYYYMMDDHH}
 * - senderId: use "global" for single sender, or actual sender id if multi-sender
 * - YYYYMMDDHH: hour window for atomic counter
 *
 * Behavior across multiple workers:
 * - INCR is atomic; all workers share the same counter per hour.
 * - When limit reached we do NOT fail the job; we compute next available
 *   hour and re-delay the job (caller responsibility).
 *
 * Preserves relative ordering: jobs that hit the limit are delayed to
 * the next hour window, so order is maintained per campaign.
 */

import { getRedis } from '../config/redis.js';
import { env } from '../config/env.js';

const KEY_PREFIX = 'email_sent:';
const TTL_SECONDS = 3660; // 1 hour + buffer

/**
 * Format hour bucket: YYYYMMDDHH
 */
export function getHourKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}${m}${d}${h}`;
}

/**
 * Redis key for the given sender and hour.
 */
export function rateLimitKey(senderId: string, hourKey: string): string {
  return `${KEY_PREFIX}${senderId}:${hourKey}`;
}

/**
 * Increment the send count for senderId in the current hour.
 * Returns the new count after increment.
 * If over limit, the counter is still incremented (caller must delay job).
 */
export async function incrementHourlyCount(senderId: string): Promise<number> {
  const redis = getRedis();
  const hourKey = getHourKey();
  const key = rateLimitKey(senderId, hourKey);
  const count = await redis.incr(key);
  if (count === 1) await redis.pexpire(key, TTL_SECONDS * 1000);
  return count;
}

/**
 * Check if we can send in the current hour without incrementing.
 */
export async function getCurrentHourCount(senderId: string): Promise<number> {
  const redis = getRedis();
  const hourKey = getHourKey();
  const key = rateLimitKey(senderId, hourKey);
  const v = await redis.get(key);
  return v ? parseInt(v, 10) : 0;
}

/**
 * Get max emails per hour from env (GLOBAL or PER SENDER).
 */
export function getMaxEmailsPerHour(): number {
  return env.maxEmailsPerHour;
}

/**
 * Returns true if the sender has capacity in the current hour.
 */
export async function canSendNow(senderId: string): Promise<boolean> {
  const count = await getCurrentHourCount(senderId);
  return count < getMaxEmailsPerHour();
}

/**
 * Calculate the next UTC moment when the next hour window starts.
 * Used when rate limit is reached: delay job until next hour.
 */
export function getNextHourStart(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

/**
 * Attempt to reserve a slot: only increment when under limit.
 * If already at limit, return allowed: false without incrementing (caller will re-delay job).
 */
export async function tryReserveSlot(senderId: string): Promise<{ allowed: boolean; count: number }> {
  const current = await getCurrentHourCount(senderId);
  const max = getMaxEmailsPerHour();
  if (current >= max) {
    return { allowed: false, count: current };
  }
  const count = await incrementHourlyCount(senderId);
  return { allowed: true, count };
}
