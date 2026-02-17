import { Request, Response, NextFunction } from 'express';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

declare global {
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.sessionUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
