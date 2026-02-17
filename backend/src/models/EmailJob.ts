import mongoose from 'mongoose';

export const EmailJobStatus = {
  SCHEDULED: 'SCHEDULED',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

const jobSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailCampaign', required: true },
    recipientEmail: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    status: { type: String, enum: Object.values(EmailJobStatus), default: 'SCHEDULED' },
    bullJobId: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

jobSchema.index({ campaignId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ scheduledAt: 1 });

export const EmailJob = mongoose.model('EmailJob', jobSchema);
