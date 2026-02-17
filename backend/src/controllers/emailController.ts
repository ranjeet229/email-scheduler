import { Request, Response } from 'express';
import { getScheduledEmails, getSentEmails } from '../services/emailJobService.js';

export async function getScheduled(req: Request, res: Response): Promise<void> {
  const userId = req.sessionUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = await getScheduledEmails(userId, limit, offset);
  res.json({ emails: rows });
}

export async function getSent(req: Request, res: Response): Promise<void> {
  const userId = req.sessionUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = await getSentEmails(userId, limit, offset);
  res.json({ emails: rows });
}
