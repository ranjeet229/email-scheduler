import mongoose from 'mongoose';
import { EmailJob } from '../models/EmailJob.js';

export async function getScheduledEmails(userId: string, limit = 100, offset = 0) {
  const docs = await EmailJob.find({
    status: 'SCHEDULED',
  })
    .populate({
      path: 'campaignId',
      match: { userId: new mongoose.Types.ObjectId(userId) },
      select: 'subject',
    })
    .sort({ scheduledAt: 1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return docs
    .filter((d) => d.campaignId && typeof d.campaignId === 'object')
    .map((d) => ({
      id: d._id.toString(),
      recipientEmail: d.recipientEmail,
      scheduledAt: d.scheduledAt,
      sentAt: d.sentAt,
      status: d.status,
      campaign: { subject: (d.campaignId as unknown as { subject: string }).subject },
    }));
}

export async function getSentEmails(userId: string, limit = 100, offset = 0) {
  const docs = await EmailJob.find({
    status: 'SENT',
  })
    .populate({
      path: 'campaignId',
      match: { userId: new mongoose.Types.ObjectId(userId) },
      select: 'subject',
    })
    .sort({ sentAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return docs
    .filter((d) => d.campaignId && typeof d.campaignId === 'object')
    .map((d) => ({
      id: d._id.toString(),
      recipientEmail: d.recipientEmail,
      scheduledAt: d.scheduledAt,
      sentAt: d.sentAt,
      status: d.status,
      campaign: { subject: (d.campaignId as unknown as { subject: string }).subject },
    }));
}
