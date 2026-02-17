import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import emailRoutes from './routes/emails.js';
import { env } from './config/env.js';

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use((req, res, next) => {
  const s = req.session as unknown as { user?: { id: string; email: string; name: string | null } };
  if (s?.user) {
    req.sessionUser = s.user;
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/emails', emailRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

export default app;
