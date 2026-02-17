/**
 * BullMQ Worker: process email jobs with concurrency, min delay, and hourly rate limit.
 */

import '../loadEnv.js';
import { Worker, Job } from 'bullmq';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { bullmqConnection } from '../config/bullmq.js';
import { EmailJob } from '../models/EmailJob.js';
import { sendMail } from '../services/emailService.js';
import {
  tryReserveSlot,
  getNextHourStart,
  getMaxEmailsPerHour,
} from '../utils/rateLimit.js';
import { emailQueue, type EmailJobPayload } from '../queues/emailQueue.js';

const QUEUE_NAME = 'email-send';
const minDelayMs = env.minDelayMs;

const worker = new Worker<EmailJobPayload>(
  QUEUE_NAME,
  async (job: Job<EmailJobPayload>) => {
    const { emailJobId, campaignId, recipientEmail, subject, body, senderId } = job.data;

    const emailJob = await EmailJob.findById(emailJobId);
    if (!emailJob || emailJob.status !== 'SCHEDULED') {
      return;
    }

    const { allowed } = await tryReserveSlot(senderId);
    if (!allowed) {
      const nextHour = getNextHourStart();
      const delayMs = Math.max(0, nextHour.getTime() - Date.now());
      await emailQueue.add(
        'send-email',
        job.data,
        { jobId: `${emailJobId}-delay-${nextHour.getTime()}`, delay: delayMs }
      );
      return;
    }

    try {
      await sendMail({
        from: env.etherealUser ? env.etherealUser : 'sender@ethereal.test',
        to: recipientEmail,
        subject,
        text: body,
      });
      await EmailJob.updateOne(
        { _id: emailJobId },
        { status: 'SENT', sentAt: new Date() }
      );
    } catch (err) {
      await EmailJob.updateOne({ _id: emailJobId }, { status: 'FAILED' });
      throw err;
    }
  },
  {
    connection: bullmqConnection,
    concurrency: env.workerConcurrency,
    limiter: { max: 1, duration: minDelayMs },
  }
);

worker.on('completed', (job) => console.log(`[Worker] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[Worker] Job ${job?.id} failed:`, err?.message));
worker.on('error', (err) => console.error('[Worker] Error:', err));

connectDb()
  .then(() => {
    console.log(`[Worker] Started. Concurrency=${env.workerConcurrency}, minDelayMs=${minDelayMs}, maxPerHour=${getMaxEmailsPerHour()}`);
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
