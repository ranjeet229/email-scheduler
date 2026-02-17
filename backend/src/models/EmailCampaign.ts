import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    startTime: { type: Date, required: true },
    delayBetweenEmails: { type: Number, required: true },
    hourlyLimit: { type: Number, required: true },
  },
  { timestamps: true }
);

campaignSchema.index({ userId: 1 });

export const EmailCampaign = mongoose.model('EmailCampaign', campaignSchema);
