/**
 * Campaign creation: persist campaign + jobs in DB, then enqueue BullMQ delayed jobs.
 * DB is source of truth; bullJobId = emailJob._id for idempotency.
 */

import { EmailCampaign } from '../models/EmailCampaign.js';
import { EmailJob } from '../models/EmailJob.js';
import { addEmailJob, type EmailJobPayload } from '../queues/emailQueue.js';

export type CreateCampaignInput = {
  userId: string;
  subject: string;
  body: string;
  recipientEmails: string[];
  startTime: Date;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
};

export async function createCampaign(input: CreateCampaignInput): Promise<{ campaignId: string; jobCount: number }> {
  const { userId, subject, body, recipientEmails, startTime, delayBetweenEmailsSeconds, hourlyLimit } = input;
  const senderId = 'global';

  const campaign = await EmailCampaign.create({
    userId,
    subject,
    body,
    startTime,
    delayBetweenEmails: delayBetweenEmailsSeconds,
    hourlyLimit,
  });

  const now = Date.now();
  const startMs = startTime.getTime();
  const createdJobs: { id: string; recipientEmail: string; scheduledAt: Date }[] = [];

  for (let index = 0; index < recipientEmails.length; index++) {
    const scheduledAt = new Date(startMs + index * delayBetweenEmailsSeconds * 1000);
    const job = await EmailJob.create({
      campaignId: campaign._id,
      recipientEmail: recipientEmails[index],
      scheduledAt,
      status: 'SCHEDULED',
      bullJobId: `pending-${campaign._id}-${index}`,
    });
    createdJobs.push({
      id: job._id.toString(),
      recipientEmail: job.recipientEmail,
      scheduledAt: job.scheduledAt,
    });
  }

  for (let i = 0; i < createdJobs.length; i++) {
    const emailJob = createdJobs[i];
    const delayMs = Math.max(0, createdJobs[i].scheduledAt.getTime() - now);
    const payload: EmailJobPayload = {
      emailJobId: emailJob.id,
      campaignId: campaign._id.toString(),
      recipientEmail: emailJob.recipientEmail,
      subject,
      body,
      senderId,
    };
    await addEmailJob(payload, delayMs);
    await EmailJob.updateOne(
      { _id: emailJob.id },
      { bullJobId: emailJob.id }
    );
  }

  return { campaignId: campaign._id.toString(), jobCount: createdJobs.length };
}
