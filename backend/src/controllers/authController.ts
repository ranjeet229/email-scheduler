import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400).json({ error: 'Email already registered' });
    return;
  }
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    name: name || null,
  });
  const session = req.session as unknown as Record<string, unknown>;
  session.userId = user._id.toString();
  session.user = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: 'Session save failed' });
      return;
    }
    res.status(201).json({
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await (user as unknown as { comparePassword: (c: string) => Promise<boolean> }).comparePassword(password))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const session = req.session as unknown as Record<string, unknown>;
  session.userId = user._id.toString();
  session.user = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: 'Session save failed' });
      return;
    }
    res.json({
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.sessionUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: req.sessionUser });
}

export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}
