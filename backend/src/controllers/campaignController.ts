import { Request, Response } from 'express';
import { createCampaign } from '../services/campaignService.js';

export async function postCampaign(req: Request, res: Response): Promise<void> {
  const userId = req.sessionUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const {
    subject,
    body,
    recipientEmails,
    startTime,
    delayBetweenEmailsSeconds,
    hourlyLimit,
  } = req.body as {
    subject: string;
    body: string;
    recipientEmails: string[];
    startTime: string;
    delayBetweenEmailsSeconds: number;
    hourlyLimit: number;
  };

  if (!subject || !body || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
    res.status(400).json({ error: 'subject, body, and non-empty recipientEmails required' });
    return;
  }
  const start = startTime ? new Date(startTime) : new Date();
  const delay = Math.max(0, Number(delayBetweenEmailsSeconds) || 60);
  const hourly = Math.max(1, Number(hourlyLimit) || 100);

  try {
    const result = await createCampaign({
      userId,
      subject,
      body,
      recipientEmails: recipientEmails.filter((e: string) => typeof e === 'string' && e.includes('@')),
      startTime: start,
      delayBetweenEmailsSeconds: delay,
      hourlyLimit: hourly,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('createCampaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
}
