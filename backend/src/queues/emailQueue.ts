/**
 * BullMQ email queue.
 *
 * Restart safety:
 * - Jobs are stored in Redis (BullMQ). On restart, BullMQ rehydrates delayed jobs
 *   from Redis; no re-enqueue from DB is needed.
 * - jobId is set to emailJob.id (DB primary key) so we have 1:1 mapping and
 *   idempotency: duplicate addJob with same jobId will be deduplicated by BullMQ
 *   when using jobId option.
 */

import { Queue } from 'bullmq';
import { bullmqConnection } from '../config/bullmq.js';

const QUEUE_NAME = 'email-send';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export type EmailJobPayload = {
  emailJobId: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderId: string;
};

/**
 * Add a delayed job. Use emailJobId as Bull jobId for idempotency:
 * - Same job never added twice (BullMQ dedup by jobId).
 * - Worker can load EmailJob by id and check status before sending.
 */
export async function addEmailJob(
  payload: EmailJobPayload,
  delayMs: number
): Promise<string> {
  const job = await emailQueue.add(
    'send-email',
    payload,
    {
      jobId: payload.emailJobId,
      delay: delayMs,
    }
  );
  return job.id!;
}
